#!/bin/bash

# Function to print usage instructions
usage() {
    echo "Usage: $0 [-t|-e] <directory_path>"
    echo "-t: Include only *.test.js files"
    echo "-e: Exclude *.test.js files"
    exit 1
}

# Check if at least one argument is provided
if [ $# -lt 1 ]; then
    usage
fi

# Parse options
mode=""
while getopts "te" opt; do
    case $opt in
        t) mode="tests_only";;
        e) mode="exclude_tests";;
        *) usage;;
    esac
done

# Shift past the options to get the directory path
shift $((OPTIND-1))

# Check if directory path is provided
if [ -z "$1" ]; then
    usage
fi

# Check if the directory exists
directory="$1"
if [ ! -d "$directory" ]; then
    echo "Error: Directory '$directory' does not exist."
    exit 1
fi

# Process files based on mode
if [ "$mode" = "tests_only" ]; then
    # Find only *.test.js files in the given directory (no recursion)
    files=$(find "$directory" -maxdepth 1 -type f -name "*.test.js")
elif [ "$mode" = "exclude_tests" ]; then
    # Find all files except *.test.js in the given directory (no recursion)
    files=$(find "$directory" -maxdepth 1 -type f ! -name "*.test.js")
else
    echo "Error: Please specify a mode (-t or -e)."
    usage
fi

# Check if any files were found
if [ -z "$files" ]; then
    echo "No matching files found in '$directory'."
    exit 0
fi

# Iterate over the files and print their name and content
for file in $files; do
    # Print file name as header
    echo "===== $file ====="
    # Print file content
    cat "$file"
    # Add a newline for separation
    echo ""
done
