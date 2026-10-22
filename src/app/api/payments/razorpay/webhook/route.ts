import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { env, isServiceRoleConfigured } from "@/lib/env";
export const runtime="nodejs";
export async function POST(request:Request){
  if(!env.RAZORPAY_WEBHOOK_SECRET||!isServiceRoleConfigured)return NextResponse.json({error:"Webhook is not configured."},{status:503});
  const raw=await request.text();const signature=request.headers.get("x-razorpay-signature")||"";
  if(!/^[a-f0-9]{64}$/i.test(signature))return NextResponse.json({error:"Invalid webhook signature."},{status:400});
  const expected=createHmac("sha256",env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest();const received=Buffer.from(signature,"hex");if(received.length!==expected.length||!timingSafeEqual(expected,received))return NextResponse.json({error:"Invalid webhook signature."},{status:400});
  let body:{event?:string;payload?:{payment?:{entity?:{order_id?:string;amount?:number;currency?:string;id?:string;status?:string}}}};
  try{body=JSON.parse(raw) as typeof body;}catch{return NextResponse.json({error:"Invalid event payload."},{status:400});}
  const payment=body.payload?.payment?.entity;const gatewayOrderId=payment?.order_id;if(!gatewayOrderId)return NextResponse.json({ok:true});
  const admin=createServiceSupabase();const {data:order}=await admin.from("orders").select("id,order_number,payment_status,payment_method,total,order_status,payment_reference").eq("payment_reference",gatewayOrderId).maybeSingle();if(!order||order.payment_method!=="razorpay")return NextResponse.json({ok:true});
  if(body.event==="payment.captured"&&payment?.status==="captured"){
    if(payment.currency!=="INR"||payment.amount!==Number(order.total))return NextResponse.json({error:"Payment amount does not match order."},{status:400});
    if(order.payment_status==="paid")return NextResponse.json({ok:true});
    const nextStatus=["new","confirmed"].includes(order.order_status)?"confirmed":order.order_status;
    const {data:updated,error}=await admin.from("orders").update({payment_status:"paid",order_status:nextStatus}).eq("id",order.id).neq("payment_status","paid").select("id").maybeSingle();
    if(error)return NextResponse.json({error:"Could not record payment."},{status:503});
    if(updated)await admin.from("order_status_history").insert({order_id:order.id,previous_status:order.order_status,next_status:nextStatus,note:`Razorpay payment captured (${payment.id||"verified"})`});
  }else if(body.event==="payment.failed"){
    await admin.rpc("release_failed_payment_stock",{p_gateway_order_id:gatewayOrderId});
  }
  return NextResponse.json({ok:true});
}
