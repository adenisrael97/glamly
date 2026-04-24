#!/bin/bash

# Image optimization script for better performance
echo "Starting image optimization..."

# Check if imageoptim-cli is installed
if ! command -v imageoptim &> /dev/null
then
    echo "imageoptim-cli not found. Installing..."
    npm install -g imageoptim-cli || brew install imageoptim-cli
fi

# Create optimized directory if it doesn't exist
mkdir -p public/images/optimized

# Optimize background images (most critical)
echo "Optimizing background images..."
find public/images/background -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" | while read img; do
    # Get filename without path
    filename=$(basename "$img")
    # Optimize and save to optimized directory
    echo "Processing $img..."
    
    # Use built-in tools for basic optimization
    if command -v convert &> /dev/null; then
        # Using ImageMagick if available
        convert "$img" -resize "1920x1080>" -quality 85 "public/images/optimized/opt_$filename"
    else
        echo "ImageMagick not found. Please install with: brew install imagemagick"
        echo "Or manually compress images to reduce file sizes."
    fi
done

echo "Image optimization complete!"
echo "Consider using online tools like TinyPNG or Squoosh if ImageMagick is not available."