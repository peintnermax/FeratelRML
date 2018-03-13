# Feratel Semantic Data Publisher

This Tool processes semistructured Feratel Data and produces schema.org annotated Data.
Results are then uploaded to [Semantify](http://www.dropwizard.io/1.0.2/docs/).

## Getting Started

This Tool is based on RML (RDF Mapping Language) and is using [RML-Mapper](https://github.com/RMLio/RML-Mapper) to process data.
## Setup

First RML-Mapper has to be cloned and built. Afterwards app.js has to be copied into the folder RML-Mapper and set up. This repository is made to show off the needed folder structure!
### Clone RML-Mapper
```
git clone --recursive https://github.com/RMLio/RML-Mapper.git

git submodule update --init --recursive
```
### Build RML-Mapper
Run
```
bin/RML-Mapper
```
### Setup NodeJS App
Copy app.js to RML-Mapper and run
```
npm install
```
### Setup folder structure

Feratel Web API Request files are stored in /XMLRequestData.
Contact Feratel for additional information.

Feratel Web API Response files are stored in /Feratel.
RML Files are stored in /RMLFiles.

Output is generated to /RMLOutput in .n3 format and is converted to JSON-LD Data into the folder /JSONLD.

## Run app.js in folder /RML-Mapper
```
node app.js <semantify API key>
```
To upload jsonld data to semantify.it, an API Key is needed and has to be passed either throw argument, or in the code itself.

## Built With

* [RML-Mapper](https://github.com/RMLio/RML-Mapper) - RML Processor
* [Maven](https://maven.apache.org/) - Dependency Management
* [Node](https://nodejs.org/en/) - Node JS
* [rdf-translator API](https://www.npmjs.com/package/rdf-translator) - N3 to JSONLD Translator

## Authors

* **Maximilian Peintner** - *Initial work*
Supervisor: Elias Kaerle MSC. [Github](https://github.com/eliaskaerle)
Semantic Technology Institute Innsbruck
