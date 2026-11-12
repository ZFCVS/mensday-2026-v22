export const CARD_DOWNLOAD_COUNT_KEY='goodmen-studio:card-downloads:v1';

export function readCardDownloadCount(storage){
  try{
    const target=storage??globalThis.localStorage;
    const value=Number.parseInt(target?.getItem(CARD_DOWNLOAD_COUNT_KEY)||'0',10);
    return Number.isSafeInteger(value)&&value>=0?value:0;
  }catch{return 0;}
}

export function recordCardDownload(storage){
  const target=storage??(()=>{try{return globalThis.localStorage;}catch{return null;}})();
  const count=readCardDownloadCount(target)+1;
  try{target?.setItem(CARD_DOWNLOAD_COUNT_KEY,String(count));}catch{}
  try{globalThis.window?.dispatchEvent(new Event('goodmen:card-download-counted'));}catch{}
  return count;
}
