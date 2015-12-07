REPORTER  ?= list
TESTS     ?= test/*.coffee

all: build

build:
	coffee -o dist --bare -c zap.coffee

test:
	./node_modules/mocha/bin/mocha \
	--reporter $(REPORTER) \
	--require should \
	--compilers coffee:coffee-script/register \
	--timeout 5000 \
	$(TESTS)

.PHONY: build test
