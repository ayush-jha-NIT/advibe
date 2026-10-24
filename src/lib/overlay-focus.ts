/** Shared keyboard and focus rules for overlay navigation. */
export function focusWrapIndex(current:number,total:number,shiftKey:boolean):number|null{
 if(!Number.isInteger(total)||total<=0)return null;
 if(current<0||current>=total)return shiftKey?total-1:0;
 if(shiftKey&&current===0)return total-1;
 if(!shiftKey&&current===total-1)return 0;
 return null;
}

/** Browser helper: only called after a drawer is mounted. */
export function trapOverlayTab(container:HTMLElement|null,event:KeyboardEvent):void{
 if(event.key!=="Tab"||!container)return;
 const elements=Array.from(container.querySelectorAll<HTMLElement>(
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
 )).filter(el=>el.getClientRects().length>0&&!el.closest('[inert]')&&!el.hasAttribute("disabled"));
 if(elements.length===0){event.preventDefault();container.focus();return;}
 const index=elements.indexOf(document.activeElement as HTMLElement);
 const next=focusWrapIndex(index,elements.length,event.shiftKey);
 if(next!==null){event.preventDefault();elements[next].focus();}
}
