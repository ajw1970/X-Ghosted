#!/bin/bash

# Function to print usage instructions
usage() {
    echo "Usage: $0 [-t|-e] <directory_path> [file1 file2 ...]"
    echo "-t: Include only *.test.js files (from provided list or directory if no files specified)"
    echo "-e: Exclude *.test.js files (from provided list or directory if no files specified)"
    echo "If no mode is specified, process the exact files listed"
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

# Shift to get the list of files (if any)
shift

# Process files based on mode and input
files=()
if [ $# -eq 0 ] && [ -n "$mode" ]; then
    # No files specified, scan directory based on mode
    if [ "$mode" = "tests_only" ]; then
        # Find only *.test.js files in the given directory (no recursion)
        while IFS= read -r file; do
            files+=("$file")
        done < <(find "$directory" -maxdepth 1 -type f -name "*.test.js")
    elif [ "$mode" = "exclude_tests" ]; then
        # Find all files except *.test.js in the given directory (no recursion)
        while IFS= read -r file; do
            files+=("$file")
        done < <(find "$directory" -maxdepth 1 -type f ! -name "*.test.js")
    fi
else
    # Process provided file list
    for file in "$@"; do
        full_path="$directory/$file"
        # Check if the file exists
        if [ -f "$full_path" ]; then
            # Apply mode filtering
            if [ "$mode" = "tests_only" ]; then
                if [[ "$file" == *.test.js ]]; then
                    files+=("$full_path")
                fi
            elif [ "$mode" = "exclude_tests" ]; then
                if [[ "$file" != *.test.js ]]; then
                    files+=("$full_path")
                fi
            else
                # No mode specified, include the file as is
                files+=("$full_path")
            fi
        else
            echo "Warning: File '$full_path' does not exist, skipping."
        fi
    done
fi

# Check if any valid files were found
if [ ${#files[@]} -eq 0 ]; then
    echo "No valid matching files found."
    exit 0
fi

# Iterate over the files and print their name and content
for file in "${files[@]}"; do
    # Print file name as header
    echo "===== $file ====="
    # Print file content
    cat "$file"
    # Add a newline for separation
    echo ""
done