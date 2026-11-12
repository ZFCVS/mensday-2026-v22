const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function checkedUrl(value){const url=new URL(value);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new TypeError('Use a valid hosted card URL.');return url.href;}
export function buildEmailMessage({recipient,greeting,sender,cardUrl,createUrl}){
  const card=checkedUrl(cardUrl),create=checkedUrl(createUrl);
  const name=String(recipient||'').trim().slice(0,50);
  if(!name)throw new Error('Recipient name is required to prepare the email.');
  const wish=String(greeting||'').trim();
  const from=String(sender||'').trim();
  const html=`<div><p>Dear ${escapeHtml(name)},</p><p>${escapeHtml(wish).replace(/\r\n|\r|\n/g,'<br>')}</p><p><strong>View your card:</strong><br><a href="${escapeHtml(card)}">View your card</a></p><p><strong>Create and send a card to someone else:</strong><br><a href="${escapeHtml(create)}">Create your own card</a></p><p>Warm regards,<br>${escapeHtml(from)}</p></div>`;
  const plain=`Dear ${name},\r\n\r\n${wish}\r\n\r\nView your card:\r\n${card}\r\n\r\nCreate and send a card to someone else:\r\n${create}\r\n\r\nWarm regards,\r\n${from}\r\n`;
  return {html,plain,cardUrl:card,createUrl:create};
}
export function copyEmailMessage(clipboard,ClipboardItemConstructor,message){
  if(!clipboard?.write||typeof ClipboardItemConstructor!=='function')throw new Error('Formatted copy is unavailable. Select the message preview and copy it manually.');
  return clipboard.write([new ClipboardItemConstructor({'text/html':new Blob([message.html],{type:'text/html'}),'text/plain':new Blob([message.plain],{type:'text/plain'})})]);
}
