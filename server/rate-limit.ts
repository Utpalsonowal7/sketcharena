export class RateLimit {
  private entries=new Map<string,{count:number;reset:number}>();
  allow(key:string,max:number,windowMs:number,now=Date.now()):boolean {
    let entry=this.entries.get(key);if(!entry || now>=entry.reset) {entry={count:0,reset:now+windowMs};this.entries.set(key,entry);}entry.count++;
    if(this.entries.size>10_000) this.prune(now);
    return entry.count<=max;
  }
  prune(now=Date.now()):void { for(const [key,value] of this.entries) if(now>=value.reset) this.entries.delete(key); }
}
