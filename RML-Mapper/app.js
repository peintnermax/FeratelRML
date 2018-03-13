const rmlfiles = '../RMLFiles/';
const outputfiles = '../RMLOutput/';
const jsonldfiles = '../JSONLD/';
const xmlfiles = '../Feratel';

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var path = require('path');
var shell = require('shelljs');
var walker = require("walker");
var request = require("request");
var rdfTranslator = require('rdf-translator');
var colors = require('colors');
var xml2js = require('xml2js');
var DOMParser = require('xmldom').DOMParser;
var parser = new xml2js.Parser({explicitArray: false, trim: true});
// fs = require('fs');


var chunkSize = 500; //number of annotations submitted at a time
var apiKey = 'HyRgQfrKM'; //your semantify API key


var giantAnnotationArray = [];

function fileCallBack(entry, stat) {
    var cid = path.basename(entry, '.json');
    var data = fs.readFileSync(entry, "utf8");
    var annotationObject = {};
    try {
        annotationObject["content"] = JSON.parse(data);
    } catch (e) {
        return;
    }
    annotationObject["cid"] = cid;

    giantAnnotationArray.push(annotationObject);
}
function endCallback() {
    var length = giantAnnotationArray.length;
    var numChunks = Math.ceil(length / chunkSize);

    console.log('\n[UPLOADING]'.yellow+' %d annotation chunks by blocks of %d, total %d transactions', length, chunkSize, numChunks);

    start = 0;
    while (numChunks > 0) {
        end = start + chunkSize;

        if (end > length) {
            end = length;
        }

        makeRequest(giantAnnotationArray.slice(start, end));

        start += chunkSize;
        numChunks--;
    }
}
function makeRequest(chunks) {
    request({
        url: "https://semantify.it/api/annotation/" + apiKey,
        method: "POST",
        json: chunks
    }, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            //console.log(body)
            console.log('[UPLOADING FINISHED]'.green);
            //deleteFolderRecursive(jsonldfiles);
        } else {
            console.log('An error on uploading occured');
            console.log(error);
            console.log("response.statusCode: " + response.statusCode);
            //console.log("response.statusText: " + response.statusText);
        }
    });
}
function msToTime(duration) {
  var milliseconds = parseInt((duration%1000)/100)
    , seconds = parseInt((duration/1000)%60)
    , minutes = parseInt((duration/(1000*60))%60)
    , hours = parseInt((duration/(1000*60*60))%24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return minutes + ":" + seconds + "." + milliseconds;
}

//Tasks in Order
function fetchFeratelDataTask(){

  var requestFilesPath = '../XMLRequestData';//iterate over all xml request files

  var countDoneXMLFiles = 0;
  return new Promise((resolve, reject) => {
    if (fs.existsSync(requestFilesPath)) {
      var numberXMLRequestFiles= fs.readdirSync(requestFilesPath).length;
      fs.readdirSync(requestFilesPath).forEach(function(file, index){
        var curPath = requestFilesPath + "/" + file;

        if (!fs.lstatSync(curPath).isDirectory()) {
          fs.readFile(curPath, 'utf8', function(err, data) {
            //console.log(curPath);
            if (!err) {
              if(curPath.indexOf('KeyValue') > -1) {//Categories,InfrastructureTypes,InfrastructureTopics,SerialEvents
                console.log('Setting url to keyValues for: '+curPath);
                var options = {
                  method: 'POST',
                  keepAlive: false,
                  url: 'http://interface.deskline.net/DSI/KeyValue.asmx',
                  headers: {
                    "Authorization": "Basic " + this.auth,
                    'Content-Type': 'text/xml; charset="utf-8"',//application/x-www-form-urlencoded',
                    'SOAPAction': 'http://interface.deskline.net/DSI/XSD',//http://tempuri.org/
                    'Content-Length': Buffer.byteLength(data)
                    //'Accept-Encoding': 'gzip'
                  },
                  body: data,
                  gzip: true //depending on the webservice, this has to be false
                };
              }else{//Infrastructure,Events,ServiceProviders
                console.log('Setting url to BasicData for: '+curPath);
                var options = {
                  method: 'POST',
                  keepAlive: false,
                  url: 'http://interface.deskline.net/DSI/BasicData.asmx',
                  headers: {
                    "Authorization": "Basic " + this.auth,
                    'Content-Type': 'text/xml; charset="utf-8"',//application/x-www-form-urlencoded',
                    'SOAPAction': 'http://interface.deskline.net/DSI/XSD',//http://tempuri.org/
                    'Content-Length': Buffer.byteLength(data)
                    //'Accept-Encoding': 'gzip'
                  },
                  body: data,
                  gzip: true //depending on the webservice, this has to be false
                };
              }
              request(options, function (error, response, body) {
                if (error!=null)console.log('Error: '+error+'\n');
                else{
                  console.log('\n'+curPath/*+JSON.stringify(options)*/+'\n'+body);
                  fs.writeFile('../Feratel2/'+path.basename(curPath),body, (err) => {
                    if (err){
                      console.log('Error on Writing Fetched Feratel Data')
                    }
                  });
                  countDoneXMLFiles++;
                  if (countDoneXMLFiles==numberXMLRequestFiles)resolve (true);
                }
              });
            }else{
              console.log('Error reading file!');
              revoke ('Error');
            }
          });
        }
      });
    }
  })

}
function parsingFeratelXMLTask(){
  var path = xmlfiles;

  var completedFiles = 0;
  var totalFiles = 0;

  if (fs.existsSync(path)) {
    var totalFiles= fs.readdirSync(path).length;
    fs.readdirSync(path).forEach(function(file, index){
      var curPath = path + "/" + file;
      if (!fs.lstatSync(curPath).isDirectory()) { // recurse
        fs.readFile(curPath, 'utf8', function(err, data) {
          data = data.replace('xmlns="http://interface.deskline.net/DSI/XSD"','')
          parser = new DOMParser();
          if (!err) {
            var doc = parser.parseFromString(data,'text/xml');
            var rootNode = doc.documentElement;
            if (rootNode.nodeName == 'FeratelDsiRS'){
              var relevantNode = rootNode.childNodes[1].childNodes[1];

              if (relevantNode.nodeName == 'KeyValues')relevantNode = relevantNode.childNodes[1];//für responsedateien muss zusätzlich keyvalues entfernt werden
              // relevantNode = doc.getElementsByTagName("ServiceProviders")[0];//ServiceProviders/Events/...
              var newNode = relevantNode.cloneNode(true);
              doc.documentElement.removeChild(rootNode);
              doc.documentElement.appendChild(newNode);
              // doc.documentElement.removeAttribute('xmlns');
              // var att = doc.documentElement;
              // att.removeAttribute('xmlns');
              fs.writeFile(curPath,doc, (err) => {
                if (err){
                  throw err;
                }
                console.log(curPath+' has been saved!');
                completedFiles++;
                if(completedFiles==totalFiles){
                  console.log('\nStart Mapping... XML->N3');
                  mappingTask();

                }
              });
            }else{
              console.log('Warning: '+curPath+' is already parsed!');
              completedFiles++;
              if(completedFiles==totalFiles){
                console.log('\nStart Mapping... XML->N3');
                mappingTask();

              }
            }
          }
        });

      }
    });
  }
}
function mappingTask(){
  var filetimes = new Array();
  var i=0;
  var mappingFilesDone=0;
  var mappingFilesCount = fs.readdirSync(rmlfiles).length;
  fs.readdirSync(rmlfiles).forEach(file => {
    var basename = path.basename(file,'.rml');
    filetimes[i]=0;
    var start = new Date().getTime();
    if (shell.exec('bin/RML-Mapper -m '+rmlfiles+file+' -o '+outputfiles+basename+'.n3').code !== 0) {
      shell.echo('Error: failed executing Mapping '+file);
      shell.exit(1);

      var end = new Date().getTime();
      filetimes[i]=end-start;
      i++;
    }else{
      mappingFilesDone++;//do only continue if all rml files are processed with success!

      var end = new Date().getTime();
      filetimes[i]=end-start;
      i++;
    }

  })
  if (mappingFilesDone==mappingFilesCount){
    console.log('\nFinished Mapping... XML->N3');
    var files_rml = fs.readdirSync(rmlfiles);
    var totalTime=0;
    for (var i = 0;i < files_rml.length;i++){
      console.log('[FINISHED] '.green+files_rml[i]+ ' Time: '+msToTime(filetimes[i]));
      totalTime+=filetimes[i];
    }
    console.log('Total Mapping Time: '+msToTime(totalTime));


    console.log('\nStart Converting... N3->JSONLD')
    convertingAndUploadingTask();
  }
}
function convertingAndUploadingTask(){
  //looking for n3 files to convert. (RMLOutput)
  var files_n3= fs.readdirSync(outputfiles);
  var executionTimeStart= new Date().getTime();

  var convertedFilesDone=0;
  var convertingFilesCount=files_n3.length-1;//one is repository folder
  // console.log(fileCount+ ' Files found to convert');
  files_n3.forEach(file => {
    if (file!='repositories'){//skip repository folder
      fs.readFile(outputfiles+file, 'utf8', function (err,data) {
        if (err) {
          console.log(err);
          console.log('Error reading the file!'.red);
        }
        else{
          //console.log('[CONVERTING] '.yellow+file+' to JSONLD');
          rdfTranslator(data, 'n3', 'json-ld', function(err, data) {
            if (err){
              console.log('[ERROR] '.red+'Converting the file '+path.basename(file,'.rml')+'.n3 failed');
            }
            else{
              fs.writeFile(jsonldfiles+path.basename(file,'.n3')+'.jsonld', data, 'utf8', function (err) {
                if (err) {
                  return console.log(err.red);
                  console.log('Error writing converted file: '+file);
                }
                else{
                  convertedFilesDone++;
                  console.log('[CONVERTED] '.green+path.basename(file,'.n3')+'.jsonld created');
                  if (convertedFilesDone==convertingFilesCount){
                    walker(jsonldfiles).on("file", fileCallBack).on("end", endCallback).on('error', function(err, entry, stat) {
                      console.log('Got error ' + err + ' on entry ' + entry.red)
                    });
                    var executionTimeEnd = new Date().getTime();
                    var executionTime = executionTimeEnd-executionTimeStart;
                    console.log('Total Converting Time: '+msToTime(executionTime));
                  }
                }
              });
            }
          });
        }
      });
    }
  });
}



if(process.argv[2]!=null){
  console.log('Semantify.it API-Key set to '+process.argv[2]);
  apiKey= process.argv[2];
}

console.log('Welcome to the Feratel Semantic Data Publisher.\nAll Files in the FeratelXML folder will be processed and uploaded to semantify.it\n');
console.log('Found RML Files:');

fs.readdirSync(rmlfiles).forEach(file => {
  console.log('[PENDING] '.yellow+file);
})


// Fetching Feratel Data is skipped

/*console.log('\nStart Fetching new Feratel Data...');
fetchFeratelDataTask()
  .then(function(xmldone) {

    console.log('Feratel Fetching complete: '+xmldone);*/
    console.log('\nStart Transforming XML Files to be processed..');
    parsingFeratelXMLTask()

    /*}, function(err) {
        console.log(err);
    });*/


    // console.log('\nStart Mapping... XML->N3');
    // mappingTask();
