# node-http-swissknife

## Install it

	npm install -f http-swissknife

## Run it

Sends 100 requests to `http://www.google.is` with 10 concurrents
	httpsn -n 100 -c 10 http://www.google.is/

Sends 10 concurrent requests from a list of URLs on `list_of_urls.txt`
    httpsn -m file -c 10 list_of_urls.txt

Receives a list or URLs on the standard input and requests them (no number of concurrent requests)
    cat some_list_of_urls.txt | httpsn -m file -w 1000 -

## Supported options

- `-m url|file` or `--mode=url|file`: Sets the running mode:
    * `url`: Tests a single URL. The URL must be supplied as a parameter (the default mode);
    * `file`: Reads the URLs from a file or standard input (if the file name is a - [dash]).
- `-n N` or `--number=N`: Sets the number of requests to perform (defaults to `1` on the url and to `infinite` on the file mode)
- `-c C` or `--concurrents=C`: Sets the number of concurrent requests (defaults to 1)
- `-w W` or `--wait=W`: Defines a wait time between requests (in ms) (not set by default)
- `-S` or `--no-stream-pause`: If reading from a file, when the number of concurrent requests is hit, keeps reading and queuing into memory.