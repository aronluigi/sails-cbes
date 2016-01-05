#!/bin/bash

repo="https://github.com/couchbase/couchbase-cli.git"
v2="2.1.1"
v3="3.1.3"
v4="4.1.0"
path="lib/cbtools/"

#clear directories in case the script has already been run; otherwise git complains and fails to clone
rm -rf "$(dirname "$0")/"$path$v2
rm -rf "$(dirname "$0")/"$path$v3
rm -rf "$(dirname "$0")/"$path$v4

git clone "-b" $v2 $repo "$(dirname "$0")/"$path$v2
git clone "-b" $v3 $repo "$(dirname "$0")/"$path$v3
git clone "-b" $v4 $repo "$(dirname "$0")/"$path$v4
