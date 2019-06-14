#!/bin/bash

if [ -z "$1" ]
	then
		echo "No argument supplied"
		exit 1
fi

if [ -d ../dist/"$1" ]
	then
		rm -R ../dist/"$1"
fi

mkdir ../dist/"$1"
cp -r ../src/* ../dist/"$1"/
cp -r ../platform/"$1"/* ../dist/"$1"/
cd ../dist/"$1"
zip -qr livehosts-"$1".zip *