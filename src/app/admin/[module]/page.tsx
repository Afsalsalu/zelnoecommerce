import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { checkHeroBannerSchema } from "@/lib/admin-banner-schema-server";
import { logHeroBannerDatabaseError } from "@/lib/admin-banner-schema";
import { createServiceSupabase } from "@/lib/supabase/server";
import { AdminProducts } from "@/components/admin-products";
import { AdminCategories } from "@/components/admin-categories";
import { AdminOrders } from "@/components/admin-orders";
import { AdminCoupons } from "@/components/admin-coupons";
import { AdminHomepage } from "@/components/admin-homepage";
import { AdminWorkbench } from "@/components/admin-workbench";
import { AdminPages } from "@/components/admin-pages";
import { AdminSettings } from "@/components/admin-settings";
import { AdminEnquiries } from "@/components/admin-enquiries";
import { getAdminModule } from "@/lib/admin-modules";
export const dynamic="force-dynamic";
type Params=Promise<{module:string}>;
export async function generateMetadata({params}:{params:Params}){const {module}=await params;return{title:getAdminModule(module)?.label||"Admin",robots:{index:false,follow:false}};}
export default async function AdminModulePage({params}:{params:Params}){const {module}=await params;const moduleConfig=getAdminModule(module);if(!moduleConfig)notFound();const {supabase}=await requireAdmin();
 if(module==="products"){const [{data:products},{data:categories}]=await Promise.all([supabase.from("products").select("*,product_images(*),product_variants(*),product_content_blocks(*),product_tag_map(tags(name,slug))").order("updated_at",{ascending:false}).limit(250),supabase.from("categories").select("*").order("sort_order")]);const normalizedProducts=((products??[]) as Array<Record<string,unknown>>).map((product)=>({...product,tags:Array.isArray(product.product_tag_map)?product.product_tag_map.map((mapping)=>{const tag=(mapping as {tags?:{name?:string;slug?:string}|null}).tags;return tag?.name&&tag.slug?{name:tag.name,slug:tag.slug}:null;}).filter((tag):tag is {name:string;slug:string}=>Boolean(tag)):[]}));return <AdminProducts products={normalizedProducts as never} categories={categories??[]}/>;}
 if(module==="categories"){const {data}=await supabase.from("categories").select("*").order("sort_order");return <AdminCategories categories={data??[]}/>;}
 if(module==="orders"){const admin=createServiceSupabase();const {data}=await admin.from("orders").select("*,order_items(*)").order("placed_at",{ascending:false}).limit(500);return <AdminOrders orders={(data??[]) as never}/>;}
 let data:unknown=[];
 if(module==="customers"){const admin=createServiceSupabase();const [{data:profiles},{data:orders},{data:addresses}]=await Promise.all([admin.from("profiles").select("*").order("created_at",{ascending:false}).limit(500),admin.from("orders").select("user_id,customer_email,order_number,total,placed_at").not("user_id","is","null").order("placed_at",{ascending:false}).limit(2000),admin.from("addresses").select("user_id,city,state,pincode").limit(1000)]);data={profiles:profiles??[],orders:orders??[],addresses:addresses??[]};}
 else if(module==="coupons"){const {data:rows}=await supabase.from("coupons").select("*").order("created_at",{ascending:false});return <AdminCoupons coupons={rows??[]}/>;}
 else if(module==="homepage"){const admin=createServiceSupabase();const [sections,banners,brands,faqs,testimonials,heroBannerSchema]=await Promise.all([supabase.from("homepage_sections").select("*").order("sort_order"),admin.from("homepage_banners").select("*").order("sort_order"),supabase.from("homepage_brands").select("*").order("sort_order"),supabase.from("faqs").select("*").order("sort_order"),supabase.from("testimonials").select("*").order("sort_order"),checkHeroBannerSchema(admin)]);if(banners.error)logHeroBannerDatabaseError("admin homepage banner load failed",banners.error);return <AdminHomepage data={{sections:sections.data??[],banners:banners.data??[],brands:brands.data??[],faqs:faqs.data??[],testimonials:testimonials.data??[]}} heroBannerSchema={heroBannerSchema}/>;}
 else if(module==="pages"){const {data:pages}=await supabase.from("site_pages").select("*").order("slug");return <AdminPages pages={pages??[]}/>;}
 else if(module==="settings"){const {data:rows}=await supabase.from("site_settings").select("*").order("setting_key");return <AdminSettings settings={rows??[]}/>;}
 else if(module==="inquiries"){const admin=createServiceSupabase();const {data:rows}=await admin.from("contact_enquiries").select("*").order("created_at",{ascending:false}).limit(500);return <AdminEnquiries enquiries={rows??[]}/>;}
 return <AdminWorkbench module={module} title={moduleConfig.label} data={data}/>;
}
