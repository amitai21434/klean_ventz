/* ============================================================
   CUSTOMER EMAILS — built here, sent by the Supabase
   "send-email" Edge Function (from the office Gmail)
   ============================================================ */
function escHtml(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function applyTemplate(tpl,vars){return tpl.replace(/\{\{(\w+)\}\}/g,(_,k)=>vars[k]!==undefined?String(vars[k]):'');}
function tplToHtml(text){return escHtml(text).replace(/\n/g,'<br>');}
function jobEmailSummary(job,servicesText,productsText){
  const rows=[
    ['Date',job.date||''],
    ['Time',job.time||''],
    ['Services',servicesText||''],
    ['Products',productsText||''],
    ['Total',job.total?`$${job.total}`:'']
  ].filter(r=>r[1]);
  return rows.map(([k,v])=>`<tr><td style="padding:6px 12px;color:#667085">${escHtml(k)}</td><td style="padding:6px 12px;font-weight:600">${escHtml(v)}</td></tr>`).join('');
}
function emailCustomerName(job,cust){return [cust.firstName,cust.lastName].filter(Boolean).join(' ')||cust.contactName||job.customerName||'there';}
function invoiceNumber(job){return 'KV-'+(job.date||'').replace(/-/g,'')+'-'+String(job.id).padStart(3,'0');}

async function sendEmail({to,subject,html,text,attachments}){
  const {data,error}=await supabaseBrowser.functions.invoke('send-email',{body:{to,subject,html,text,attachments}});
  if(error){
    let msg=error.message;
    try{const b=await error.context.json();if(b&&b.error)msg=b.error;}catch(e){}
    throw new Error(msg||'Email send failed');
  }
  return data;
}

/* appointment confirmation — sent when a job is booked */
async function sendConfirmationEmail(job,cust){
  const servicesText=(job.services||[]).map(svcName).join(', ');
  const productsText=(job.products||[]).map(svcName).join(', ');
  const customerName=emailCustomerName(job,cust);
  const tplVars={customerName,businessName:SETTINGS.businessName,date:job.date||'',time:job.time||'',services:servicesText,products:productsText,total:job.total?'$'+job.total:'',reviewLink:SETTINGS.googleReviewUrl||'',address:cust.address||'',techName:job.techName||'',phone:SETTINGS.phone||''};
  const tpl=SETTINGS.emailTplConfirm;
  const html=tpl
    ?`<div style="font-family:Arial,sans-serif;line-height:1.5;color:#101828"><p>${tplToHtml(applyTemplate(tpl,tplVars))}</p><table style="border-collapse:collapse;margin:16px 0">${jobEmailSummary(job,servicesText,productsText)}</table></div>`
    :`<div style="font-family:Arial,sans-serif;line-height:1.5;color:#101828"><h2 style="margin:0 0 12px">Appointment confirmed</h2><p>Hi ${escHtml(customerName)}, your ${escHtml(SETTINGS.businessName)} appointment is confirmed.</p><table style="border-collapse:collapse;margin:16px 0">${jobEmailSummary(job,servicesText,productsText)}</table><p>If you need to make a change, reply to this email or call us.</p></div>`;
  return sendEmail({
    to:cust.email,
    subject:`Appointment confirmed - ${job.date||SETTINGS.businessName}`,
    html,
    text:tpl?applyTemplate(tpl,tplVars):`Appointment confirmed for ${customerName} on ${job.date||''} at ${job.time||''}. Services: ${servicesText}`
  });
}

/* job completed — one email with the PDF receipt/invoice attached + review request */
async function sendCompletedEmail(job,cust){
  const customerName=emailCustomerName(job,cust);
  const isInvoice=!job.payment||job.payment.includes('Invoice');
  const pdfBase64=await buildReceiptPdfBase64(job,cust);
  const tplVars={customerName,businessName:SETTINGS.businessName,date:job.date||'',time:job.time||'',services:'',total:job.total?'$'+job.total:'',reviewLink:SETTINGS.googleReviewUrl||'',address:cust.address||'',techName:job.techName||'',phone:SETTINGS.phone||''};
  const tpl=SETTINGS.emailTplReceipt;
  const reviewBtn=`<p><a href="${escHtml(SETTINGS.googleReviewUrl)}" style="display:inline-block;background:#101828;color:white;padding:10px 14px;border-radius:6px;text-decoration:none">Leave a review</a></p>`;
  const html=tpl
    ?`<div style="font-family:Arial,sans-serif;line-height:1.5;color:#101828"><p>${tplToHtml(applyTemplate(tpl,tplVars))}</p></div>`
    :`<div style="font-family:Arial,sans-serif;line-height:1.5;color:#101828"><h2 style="margin:0 0 12px">Thanks for choosing ${escHtml(SETTINGS.businessName)}!</h2><p>Hi ${escHtml(customerName)}, your job on ${escHtml(job.date||'')} is complete. Your ${isInvoice?'invoice':'receipt'} is attached as a PDF.</p><p>${isInvoice?'Please contact us to arrange payment if you have not already done so.':'Payment received. Thank you.'}</p><p>If you were happy with the service, we would really appreciate a quick Google review:</p>${reviewBtn}</div>`;
  return sendEmail({
    to:cust.email,
    subject:`${isInvoice?'Invoice':'Receipt'} - ${SETTINGS.businessName}`,
    html,
    text:tpl?applyTemplate(tpl,tplVars):`Your ${SETTINGS.businessName} job is complete. Total: ${job.total?'$'+job.total:''}. Review link: ${SETTINGS.googleReviewUrl}`,
    attachments:[{filename:`${invoiceNumber(job)}.pdf`,content:pdfBase64}]
  });
}

/* kind: 'confirmation' | 'completed'. Returns true if the email went out. */
async function sendJobEmail(kind,job,cust){
  if(!cust||!cust.email)return false;
  try{
    if(kind==='confirmation')await sendConfirmationEmail(job,cust);
    else await sendCompletedEmail(job,cust);
    return true;
  }catch(err){console.error('sendJobEmail error',err);return false;}
}

/* ---------- PDF receipt / invoice (mirrors the in-app invoice layout) ---------- */
let _logoDataUrl=null;
async function loadLogoDataUrl(){
  if(_logoDataUrl!==null)return _logoDataUrl;
  try{
    const blob=await (await fetch(LOGO_SRC)).blob();
    _logoDataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
  }catch(e){console.error('logo load error',e);_logoDataUrl='';}
  return _logoDataUrl;
}
async function buildReceiptPdfBase64(job,cust){
  const C={ink900:'#1A1815',ink700:'#46433D',ink500:'#76726A',line:'#E7E3DB',green:'#2E7250',greenBg:'#E8F0E7',amber:'#946312',amberBg:'#F6ECD6',red:'#A6382F'};
  const doc=new window.jspdf.jsPDF({unit:'pt',format:'letter'});
  const LX=50,FULLW=512,RX=LX+FULLW;
  const paid=job.payment&&!job.payment.includes('Invoice');
  const docType=paid?'RECEIPT':'INVOICE';
  const billName=[cust.firstName,cust.lastName].filter(Boolean).join(' ')||cust.contactName||job.customerName||'';
  const font=(face,style,size,color)=>{doc.setFont(face,style);doc.setFontSize(size);doc.setTextColor(color);};
  const hline=(x1,x2,y,color,w)=>{doc.setDrawColor(color);doc.setLineWidth(w||1);doc.line(x1,y,x2,y);};

  // header: logo + business, document type on the right
  const logo=await loadLogoDataUrl();
  let textX=LX;
  if(logo){try{doc.addImage(logo,'JPEG',LX,50,46,46);textX=LX+58;}catch(e){}}
  font('helvetica','bold',16,C.ink900);doc.text(SETTINGS.businessName||'',textX,64);
  font('helvetica','normal',9,C.ink500);doc.text(SETTINGS.businessSub||'',textX,78);
  font('courier','normal',9,C.ink500);doc.text(`${SETTINGS.phone||''} · ${SETTINGS.website||''}`,textX,90);
  font('helvetica','bold',22,C.ink900);doc.text(docType,RX,70,{align:'right'});
  font('courier','normal',9,C.ink500);doc.text(`No. ${invoiceNumber(job)}`,RX,86,{align:'right'});doc.text(job.date||'',RX,98,{align:'right'});
  hline(LX,RX,112,C.ink900,1.5);

  // bill to / service date
  let y=134;
  font('helvetica','bold',8,C.ink500);doc.text('BILL TO',LX,y);doc.text('SERVICE DATE',RX,y,{align:'right'});
  y+=16;
  font('helvetica','bold',12,C.ink900);doc.text(billName,LX,y);
  font('courier','normal',9,C.ink700);doc.text(`${job.date||''} ${job.time||''}`,RX,y,{align:'right'});
  const partyLines=[];
  if(cust.isCompany&&cust.contactName)partyLines.push(['helvetica',cust.contactName]);
  if(cust.address)partyLines.push(['helvetica',cust.address]);
  if(cust.phone)partyLines.push(['courier',cust.phone]);
  if(cust.email)partyLines.push(['helvetica',cust.email]);
  partyLines.forEach(([face,t])=>{y+=12;font(face,'normal',9,C.ink500);doc.text(t,LX,y);});
  y+=26;

  // line items
  font('helvetica','bold',8,C.ink700);doc.text('DESCRIPTION',LX,y);doc.text('AMOUNT',RX,y,{align:'right'});
  y+=6;hline(LX,RX,y,C.ink900,1.5);y+=16;
  let subtotal=0;const items=[];
  (job.services||[]).forEach(id=>{
    const s=SERVICES.find(x=>String(x.id)===String(id));if(!s)return;
    const qty=(job.serviceQtys&&job.serviceQtys[id]!=null)?Number(job.serviceQtys[id]):1;
    const price=(job.servicePrices&&job.servicePrices[id]!=null)?Number(job.servicePrices[id]):(s.price||0);
    subtotal+=price*qty;items.push([qty>1?`${qty}× ${s.name}`:s.name,price*qty]);
  });
  (job.products||[]).forEach(id=>{const p=PRODUCTS.find(x=>String(x.id)===String(id));if(p){subtotal+=p.price||0;items.push([p.name,p.price||0]);}});
  if(job.surchargeAmt){subtotal+=job.surchargeAmt;items.push(['Above 2nd floor surcharge',job.surchargeAmt]);}
  if(!items.length){font('helvetica','normal',10,C.ink500);doc.text('No items recorded',LX,y);y+=16;}
  items.forEach(([name,price])=>{
    const lines=doc.splitTextToSize(String(name),340);
    font('helvetica','normal',10,C.ink900);doc.text(lines,LX,y);
    font('courier','normal',10,C.ink900);doc.text(`$${Number(price).toFixed(2)}`,RX,y,{align:'right'});
    y+=lines.length*12;hline(LX,RX,y-4,C.line);y+=10;
  });

  // totals
  y+=6;
  const discount=job.discount||0;
  const total=(typeof job.total==='number'&&job.total)?job.total:Math.max(0,subtotal-discount);
  const totalsX=RX-220;
  const totalRow=(label,value,opts={})=>{
    font('helvetica',opts.bold?'bold':'normal',opts.size||10,opts.color||C.ink900);doc.text(label,totalsX,y);
    font('courier',opts.bold?'bold':'normal',opts.size||10,opts.color||C.ink900);doc.text(value,RX,y,{align:'right'});
    y+=(opts.size||10)+6;
  };
  totalRow('Subtotal',`$${subtotal.toFixed(2)}`);
  if(discount)totalRow(`Discount${job.discountReason?' ('+job.discountReason+')':''}`,`-$${Number(discount).toFixed(2)}`,{color:C.red});
  hline(totalsX,RX,y-6,C.ink900,1.5);y+=10;
  totalRow('Total',`$${Number(total).toFixed(2)}`,{bold:true,size:14});
  y+=10;

  // paid / balance due callout
  const calloutH=paid?26:40;
  doc.setFillColor(paid?C.greenBg:C.amberBg);doc.roundedRect(LX,y,FULLW,calloutH,6,6,'F');
  font('helvetica','bold',10,paid?C.green:C.amber);doc.text(paid?`PAID · ${job.payment}`:`BALANCE DUE: $${Number(total).toFixed(2)}`,LX+12,y+17);
  if(!paid){font('helvetica','normal',8,C.amber);doc.text('Payment options: Cash, Check, Venmo, Zelle, CashApp, Wire',LX+12,y+30);}
  y+=calloutH+20;

  // notes
  const note=(label,text)=>{
    font('helvetica','bold',9,C.ink900);doc.text(label,LX,y);
    const lw=doc.getTextWidth(label+' ');
    font('helvetica','normal',9,C.ink500);
    const lines=doc.splitTextToSize(String(text),FULLW-lw);
    doc.text(lines,LX+lw,y);y+=lines.length*11+8;
  };
  if(job.customerNote)note('Note:',job.customerNote);
  if(job.techNotes)note('Notes:',job.techNotes);

  // footer
  y+=10;hline(LX,RX,y,C.line);y+=16;
  font('helvetica','normal',9,C.ink500);doc.text("Thank you for your business! We'd love a review:",LX+FULLW/2,y,{align:'center'});
  y+=12;font('courier','normal',9,C.ink900);doc.text(SETTINGS.googleReviewUrl||'',LX+FULLW/2,y,{align:'center'});

  return doc.output('datauristring').split(',')[1];
}
