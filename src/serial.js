import { LineParser, Protocol } from './core.js';

export class ScaleConnection {
  constructor(onMessage,onStatus) { this.onMessage=onMessage;this.onStatus=onStatus;this.port=null;this.reader=null;this.closing=false;this.commandId=0;this.pending=new Map();this.retry=null;this.generation=0;this.writing=Promise.resolve();this.connecting=null;this.readTask=null; }
  async connect(choose=true) {
    if (!navigator.serial) throw new Error('Use the desktop app or Chrome/Edge to connect a USB scale.');
    if(this.port || this.connecting)return this.connecting;
    this.closing=false;clearTimeout(this.retry);const generation=++this.generation;
    this.connecting=(async()=>{
      const port=choose ? await navigator.serial.requestPort() : (await navigator.serial.getPorts())[0];
      if(this.closing||generation!==this.generation)return;
      if(!port){this.onStatus('No paired device. Choose Connect scale.');if(!choose)this.scheduleRetry();return;}
      await port.open({baudRate:115200});
      if(this.closing||generation!==this.generation){await port.close();return;}
      this.port=port;this.readTask=this.read(port,generation);
    })();
    try{await this.connecting;}catch(error){if(!choose&&!this.closing)this.scheduleRetry();throw error;}finally{this.connecting=null;}
  }
  scheduleRetry(){clearTimeout(this.retry);if(!this.closing)this.retry=setTimeout(()=>{void this.connect(false).catch(error=>this.onStatus(error.message));},3000);}
  async read(port,generation){
    const protocol=new Protocol();
    this.onStatus('Connected · waiting for GravityExplorer firmware');
    const parser=new LineParser(message=>{
      const previousBoot=protocol.boot;
      const valid=protocol.accept(message);if(!valid)return;
      if(previousBoot && previousBoot!==protocol.boot) this.onMessage({type:'restart'});
      if(valid.type==='ack') {
        const pending=this.pending.get(valid.id);
        if(pending){clearTimeout(pending.timeout);this.pending.delete(valid.id);valid.ok?pending.resolve(valid):pending.reject(new Error(valid.message||'Command rejected'));}
      }
      this.onMessage(valid);
    },()=>this.onStatus('Malformed serial data ignored'));
    const decoder=new TextDecoder();
    try {
      this.reader=port.readable.getReader();
      while(!this.closing && this.generation===generation){
        const {value,done}=await this.reader.read();if(done)break;parser.push(decoder.decode(value,{stream:true}));
      }
    } catch(error) { if(!this.closing)this.onStatus(`Scale disconnected: ${error.message}`); }
    finally {
      this.reader?.releaseLock();this.reader=null;
      try{await port.close();}catch{/* A removed USB device may already be closed. */}
      if(this.port===port)this.port=null;
      for(const pending of this.pending.values()){clearTimeout(pending.timeout);pending.reject(new Error('Scale disconnected'));}this.pending.clear();
      if(!this.closing){this.onMessage({type:'disconnected'});this.onStatus('Scale disconnected · retrying');this.scheduleRetry();}
    }
  }
  async command(name,value='') {
    if(!this.port?.writable)throw new Error('Connect the Arduino first.');
    if(!['TARE','CAL'].includes(name))throw new Error('Unknown command');
    const id=++this.commandId;
    const result=new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{this.pending.delete(id);reject(new Error('No acknowledgement from Arduino.'));},5000);
      this.pending.set(id,{resolve,reject,timeout});
    });
    // Attach the rejection handler immediately, including while a USB write is pending.
    result.catch(()=>{});
    try {
      this.writing=this.writing.catch(()=>{}).then(async()=>{
        const writer=this.port.writable.getWriter();
        try{await writer.write(new TextEncoder().encode(`${name} ${id}${value!==''?' '+value:''}\n`));}finally{writer.releaseLock();}
      });
      await this.writing;
    } catch(error){const pending=this.pending.get(id);if(pending){clearTimeout(pending.timeout);this.pending.delete(id);pending.reject(error);}}
    return result;
  }
  async disconnect(){this.closing=true;++this.generation;clearTimeout(this.retry);await this.connecting?.catch(()=>{});if(this.reader)await this.reader.cancel().catch(()=>{});await this.readTask;this.readTask=null;}
}
