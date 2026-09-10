import "./globals.css";
import { WhopThemeScript, WhopIframeSdkProvider } from "@whop/react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fitz - Fitness Coaching for Whop",
  description: "Manage client check-ins, workout routines, and macro targets inside Whop.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID || process.env.WHOP_APP_ID || "app_fitz_dev";

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <WhopThemeScript />
        <script
          dangerouslySetInnerHTML={{
            __html:
              '!function(w,d,s,u,n,a,b){if(w[n])return;a=w[n]={q:[],t:+new Date,s:[],o:u,track:function(){a.q.push([+new Date].concat([].slice.call(arguments)))},setScope:function(){a.s=[].slice.call(arguments).filter(function(x){return typeof x==="string"});a.q.push([+new Date,"setScope"].concat(a.s))},scope:function(){var c=[].slice.call(arguments);return{track:function(){a.q.push([+new Date].concat([].slice.call(arguments)).concat([{__scope:c}]))}}}};b=d.createElement(s);b.async=1;b.src=u+"/s.js";d.getElementsByTagName(s)[0].parentNode.insertBefore(b,d.getElementsByTagName(s)[0])}(window,document,"script","https://t.whop.tw","whop");whop.setScope("biz_lapNW4qSKZlOA5");whop.track("page");',
          }}
        />
      </head>
      <body className="min-h-screen bg-[#111111] text-zinc-100 antialiased">
        <WhopIframeSdkProvider options={{ appId }}>
          {children}
        </WhopIframeSdkProvider>
      </body>
    </html>
  );
}
