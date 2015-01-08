REPORTER  ?= list
TESTS     ?= test/*.coffee

all: build

build:
	browserify -t coffeeify --extension=".coffee" zap.coffee > dist/zap.js

test:
	./node_modules/mocha/bin/mocha \
	--reporter $(REPORTER) \
	--require should \
	--compilers coffee:coffee-script/register \
	--timeout 5000 \
	$(TESTS)

.PHONY: build test
