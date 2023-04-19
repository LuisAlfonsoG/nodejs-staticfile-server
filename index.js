const {createServer} = require("http");
const {createReadStream} = require("fs");
const {stat, readdir} = require("fs").promises;
const mime = require("mime");
const {parse} = require("url");
const {resolve, sep} = require("path");

const baseDirectory = process.cwd();

function urlPath(url){

	let {pathname} = parse(url);

	if(pathname === "/") return baseDirectory + "/public/index.html";

	let path = resolve("public/" + decodeURIComponent(pathname).slice(1));

	if(path != baseDirectory && !path.startsWith(baseDirectory + sep)){
		throw {status: 403, body: "Forbidden"};
	}

	const allowedDir = baseDirectory + "/public";
	
	return allowedDir + pathname;
}

const methods = {
	GET: async (request) => {
		let path = urlPath(request.url);
		let stats;
		try{
			stats = await stat(path);
		} catch(error){
			if(error.code != "ENOENT") return error;
			else return {status: 404, body: "File not found"};
		}
		if(stats.isDirectory()){
			return {body: (await readdir(path)).join("\n")}
		} else{
			return {
				body: createReadStream(path),
				type: mime.getType(path)
			}
		}
	},
	notAllowed: async (request) => {
		return {
			status: 405,
			body: `Method ${request.method} not allowed.`
		}
	}
}

createServer((req, res) => {
	let handler = methods[req.method] || methods.notAllowed;	
	
	handler(req)
		.catch(error => {
			if(error.status != null) return error;
			else return {body: String(error), status: 500}; 
		})
		.then(({body, status = 200, type = "text/plain"}) => {
			res.writeHead(status, {"Content-Type": type});
			if(body && body.pipe) body.pipe(res);
			else res.end(body);
		})
	
}).listen(8000);

console.log("Listening on Port: 8000");
