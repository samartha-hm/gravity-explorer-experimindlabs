import test from 'node:test';
import assert from 'node:assert/strict';
import { ScaleConnection } from '../src/serial.js';

test('USB transport opens once, parses split frames, acknowledges commands and closes',async()=>{
  let controller,opens=0,closes=0,lastWrite='';
  const encoder=new TextEncoder();
  const port={
    readable:new ReadableStream({start(c){controller=c;}}),
    writable:new WritableStream({write(bytes){lastWrite=new TextDecoder().decode(bytes);controller.enqueue(encoder.encode('{"v":1,"boot":"uno-1","seq":3,"type":"ack","id":1,"ok":true}\n'));}}),
    async open(options){assert.equal(options.baudRate,115200);opens++;},
    async close(){closes++;}
  };
  const original=Object.getOwnPropertyDescriptor(navigator,'serial');
  Object.defineProperty(navigator,'serial',{configurable:true,value:{requestPort:async()=>port,getPorts:async()=>[port]}});
  const received=[],connection=new ScaleConnection(m=>received.push(m),()=>{});
  try{
    await Promise.all([connection.connect(),connection.connect()]);assert.equal(opens,1);
    controller.enqueue(encoder.encode('{"v":1,"boot":"uno-1","seq":1,"type":"hel'));
    controller.enqueue(encoder.encode('lo","calibrated":true}\n{"v":1,"boot":"uno-1","seq":2,"type":"measurement","kg":60,"valid":true}\n'));
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(received.map(m=>m.type),['hello','measurement']);
    const ack=await connection.command('TARE');assert.equal(ack.ok,true);assert.equal(lastWrite,'TARE 1\n');
    await connection.disconnect();assert.equal(closes,1);assert.equal(connection.port,null);assert.equal(connection.retry,null);
    await assert.rejects(connection.command('TARE'),/Connect the Arduino/);
  }finally{await connection.disconnect();if(original)Object.defineProperty(navigator,'serial',original);else delete navigator.serial;}
});

test('failed background USB open schedules retry, manual disconnect cancels it',async()=>{
  Object.defineProperty(navigator,'serial',{configurable:true,value:{getPorts:async()=>[{open:async()=>{throw new Error('USB unavailable');}}]}});
  const connection=new ScaleConnection(()=>{},()=>{});
  try{await assert.rejects(connection.connect(false),/USB unavailable/);assert.ok(connection.retry);await connection.disconnect();assert.equal(connection.retry._destroyed,true);}
  finally{await connection.disconnect();delete navigator.serial;}
});
