import { OrderTracker } from "@/components/order-tracker";
export const metadata={title:"Track your order",robots:{index:false,follow:false}};
export default function TrackOrderPage(){return <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 lg:px-12 lg:py-20"><header className="mb-9"><span className="eyebrow">A little reassurance</span><h1 className="mt-3 font-display text-5xl sm:text-6xl">Track an order</h1><p className="mt-3 max-w-xl text-sm leading-7 text-muted">Enter your order number and the email address or phone number used at checkout.</p></header><OrderTracker/></div>;}
