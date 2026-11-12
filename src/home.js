import { CARD_DOWNLOAD_COUNT_KEY, readCardDownloadCount } from './wish-counter.mjs';

const countElement=document.getElementById('wish-count');
const labelElement=document.getElementById('wish-count-label');

function updateDownloadCount(){
  const count=readCardDownloadCount();
  if(countElement)countElement.textContent=count.toLocaleString('en-IN');
  if(labelElement)labelElement.textContent=`card download${count===1?'':'s'} recorded on this device`;
}

window.addEventListener('storage',event=>{
  if(event.key===CARD_DOWNLOAD_COUNT_KEY||event.key===null)updateDownloadCount();
});
window.addEventListener('goodmen:card-download-counted',updateDownloadCount);
updateDownloadCount();
