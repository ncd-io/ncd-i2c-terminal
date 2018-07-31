const express = require('express');
const comms = require('ncd-red-comm');
const app = express();
const nSplit = /[\da-fA-FxX]+/gm;
const sp = require('serialport');

var pool = {};

function getBytes(num){
	num *= 1;
	if(num < 256) return [num];
	var ret = [];
	while(num > 255){
		ret.unshift(num & 255);
		num = num >> 8;
	}
	return ret;
}
function parseInput(input, format){
	var m;
	var d = [];
	while ((m = nSplit.exec(input)) !== null) {
	    // This is necessary to avoid infinite loops with zero-width matches
	    if (m.index === nSplit.lastIndex) {
	        nSplit.lastIndex++;
	    }

	    // The result can be accessed through the `m`-variable.
	    m.forEach((match, groupIndex) => {
			var num = format == 'int' ? match : parseInt(match, 16);
			d.push(...getBytes(num));
	    });
	}
	return d;
}

function getComm(type, addr, port){
	if(typeof pool[addr] == 'undefined'){
		if(type == 'ncd-usb'){
			var serial = new comms.NcdSerial(addr, 115200);
			i2c = new comms.NcdSerialI2C(serial, port*1);
		}else{
			i2c = new comms.NcdI2C(addr);
		}
		pool[addr] = i2c;
	}
	return pool[addr];
}

function scan(i2c){
	var valid = [];
	var promises = [];
	for(var i=1;i<129;i++){
		promises.push(new Promise((fulfill, reject) => {
				var addr = i;
				i2c.writeByte(addr, 0).then(() => {
					//console.log(addr);
					valid.push(addr);
					fulfill();
				}).catch((err) => {
					fulfill();
				});
			})
		);
	}
	return new Promise((fulfill, reject) => {
		Promise.all(promises).then((res) => {
			fulfill(valid);
		}).catch((err) => {
			reject(err);
		});
	});
}
app.use(express.static('app'));
app.use(express.urlencoded({ extended: true }));
app.post('/ajax-submit', (req, res) => {
	console.log(req.body);
	var i2c = getComm(req.body['comm-type'], req.body['input-bus'], req.body['input-port']);

	var promise;

	var args = [req.body.address*1];
	if(req.body['command-type'] == 'read'){
		if(req.body.register.length){
			args.push(...parseInput(req.body.register, req.body['input-format']));
		}
		args.push(req.body['read-length']*1);
		promise = i2c.readBytes(...args);
	}else{
		var data = parseInput(req.body.input, req.body['input-format']);
		if(req.body.register.length){
			args.push(parseInput(req.body.register, req.body['input-format'])[0]);
		}
		args.push(...data);
		if(req.body.register || data.length > 1){
			console.log(args);
			promise = i2c.writeBytes(...args);
		}else{
			promise = i2c.writeByte(...args);
		}

	}
	promise.then((result) => {
		if(req.body['output-format'] == 'hex'){
			console.log('make hex');
			result.map((v) => v.toString(16));
		}
		res.json(result);
	}).catch((err) => {
		console.log(err);
		console.log(args);
		res.json(err);
	});
});
app.get('/get-comms/ncd-usb', (req, res) => {
	var busses = [];
	sp.list().then((ports) => {
		ports.forEach((p) => {
			busses.push(p.comName);
		});
	}).catch((err) => {

	}).then(() => {
		res.json(busses);
	});
})
app.get('/get-i2c/:type/:addr/:port', (req, res) => {
	var addr = decodeURIComponent(req.params.addr);
	var i2c = getComm(req.params.type, addr, req.params.port);
	scan(i2c).then((devs) => {
		res.json(devs);
	}).catch(console.log);
});
app.listen("4201", () => {
	console.log('NCD Terminal Running at localhost:4201/terminal.html');
});
