#!/bin/bash

if [ -z "$1" ]
	then
		echo "No argument supplied"
		exit 1
fi

# Move to the root directory
cd ..

# Remove old dist directory
if [ -d ./dist/"$1" ]
	then
		rm -R ./dist/"$1"
fi
# Recreate dist directory
mkdir ./dist/"$1"

# Copy source, except popup dir (managed by Vite)
#cp -r ./src/* ./dist/"$1"/
rsync -a --exclude='popup' ./src/ ./dist/"$1"

# Copy platform-specific manifest file
cp -r ./platform/"$1"/* ./dist/"$1"/

# Build Vue popup with Vite
cd ./src/popup
#rm -rf node_modules
npm install
npm run build
cd ../..
mv ./dist/popup ./dist/"$1"/popup

# Create zip
cd ./dist/"$1"
zip -qr livehosts-"$1".zip *