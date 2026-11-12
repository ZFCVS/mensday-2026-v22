/** Prepare outside the click handler; invoke native sharing synchronously from
 * the destination button's fresh user gesture. No queued automatic popup. */
export function createShareDelivery({getKey,buildFiles,onStatus=()=>{}}){
  let ready=null,pending=null,revision=0;
  function getReady(){return ready?.key===getKey()?ready:null;}
  function invalidate(){revision++;ready=null;onStatus('idle');}
  function prepare(){
    const key=getKey(),cached=getReady();if(cached)return Promise.resolve(cached);
    if(pending)return pending.promise.catch(()=>null).then(()=>prepare());
    const version=revision;onStatus('preparing');
    const task={key,promise:null};
    task.promise=Promise.resolve().then(()=>buildFiles()).then(files=>{
      if(version!==revision||key!==getKey())throw Object.assign(new Error('The card changed. Preparing the latest version.'),{name:'StaleShareError'});
      ready={key,files};onStatus('ready');return ready;
    }).catch(error=>{onStatus(error.name==='StaleShareError'?'idle':'error',error);throw error;}).finally(()=>{if(pending===task)pending=null;});
    pending=task;return task.promise;
  }
  function shareNow(navigator,payload){
    const prepared=getReady();if(!prepared)throw new Error('The latest card is still being prepared.');
    if(typeof navigator.share!=='function')throw new Error('File sharing is not supported in this browser. Use the download buttons or copy the card link.');
    if(navigator.canShare&&!navigator.canShare({files:prepared.files}))throw new Error('This device cannot share PNG and GIF together. Download them separately or share the card link.');
    // Deliberately no await or rendering before this call.
    return navigator.share({...payload,files:prepared.files});
  }
  return {getReady,invalidate,prepare,shareNow};
}
