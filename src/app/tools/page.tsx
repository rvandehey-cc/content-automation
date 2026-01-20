
"use client";

import React, { useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ToolsPage() {
  const bookmarkletCode = `javascript:(function(){var a=document.querySelectorAll('.attachment');var f=0,d=0,s=0,i=0;function next(){if(i>=a.length){alert('Done!\\nAlt Text Fixed: '+f+'\\nMarked Decorative: '+d+'\\nSkipped: '+s);return}a[i].click();setTimeout(function(){var c=document.querySelector('%23attachment-details-two-column-caption');var t=document.querySelector('%23attachment-details-two-column-alt-text');var dec=document.querySelector('input.decorative-checkbox');if(c&&t&&c.value.trim()&&!t.value.trim()){t.value=c.value;t.dispatchEvent(new Event('change',{bubbles:true}));t.dispatchEvent(new Event('input',{bubbles:true}));f++}else if(dec&&!dec.checked&&t&&!t.value.trim()){dec.checked=true;dec.dispatchEvent(new Event('change',{bubbles:true}));dec.dispatchEvent(new Event('click',{bubbles:true}));d++}else{s++}i++;setTimeout(next,300)},400)}next()})();`;
  
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (linkRef.current) {
      linkRef.current.href = bookmarkletCode;
    }
  }, [bookmarkletCode]);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Tools & Utilities</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>WP Alt Text Fixer</CardTitle>
            <CardDescription>
              Automates fixing alt text in WordPress media library.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To install: <strong>Drag this button</strong> to your bookmarks bar.
            </p>
            <div className="flex justify-center">
              <Button asChild className="cursor-grab active:cursor-grabbing">
                <a ref={linkRef} href="#" title="WP Alt Text Fixer" onClick={(e) => e.preventDefault()}>
                  WP Alt Text Fixer
                </a>
              </Button>
            </div>
            <div className="text-xs text-muted-foreground bg-muted p-4 rounded-md">
              <p className="font-semibold mb-2">How to use:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Make sure your bookmarks bar is visible (Cmd+Shift+B)</li>
                <li>Drag the button above to the bar</li>
                <li>Go to your WordPress Media Library (List View recommended)</li>
                <li>Click the "WP Alt Text Fixer" bookmark to run</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
