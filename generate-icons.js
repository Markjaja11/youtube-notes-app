const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const sizes = [16, 32, 64, 128, 256, 512, 1024];
const assetsDir = path.join(__dirname, 'assets');
const buildDir = path.join(__dirname, 'build');
const iconsDir = path.join(buildDir, 'icons');

// Ensure directories exist
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('🎨 Generating app icons for Laman...\n');

const svgPath = path.join(assetsDir, 'logo.svg');
const svgBuffer = fs.readFileSync(svgPath);

// Generate PNGs of various sizes
async function generatePNGs() {
  console.log('📐 Generating PNG files...');

  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon_${size}x${size}.png`);

    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`   ✓ ${size}x${size}px`);
    } catch (error) {
      console.error(`   ✗ Failed to generate ${size}x${size}px:`, error.message);
    }
  }

  // Generate the main 1024px icon for electron-builder
  const mainIconPath = path.join(buildDir, 'icon.png');
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(mainIconPath);

  console.log(`   ✓ Main icon (1024x1024px) saved to build/icon.png\n`);

  return mainIconPath;
}

// Generate macOS .icns file
async function generateICNS() {
  if (process.platform !== 'darwin') {
    console.log('⚠️  Skipping .icns generation (requires macOS)\n');
    return;
  }

  console.log('🍎 Generating macOS .icns file...');

  try {
    // Create iconset directory
    const iconsetDir = path.join(buildDir, 'icon.iconset');
    if (!fs.existsSync(iconsetDir)) {
      fs.mkdirSync(iconsetDir, { recursive: true });
    }

    // Generate all required sizes for .icns
    const icnsSizes = [
      { size: 16, scale: 1 },
      { size: 16, scale: 2 },
      { size: 32, scale: 1 },
      { size: 32, scale: 2 },
      { size: 128, scale: 1 },
      { size: 128, scale: 2 },
      { size: 256, scale: 1 },
      { size: 256, scale: 2 },
      { size: 512, scale: 1 },
      { size: 512, scale: 2 }
    ];

    for (const { size, scale } of icnsSizes) {
      const actualSize = size * scale;
      const filename = scale === 2 ? `icon_${size}x${size}@2x.png` : `icon_${size}x${size}.png`;
      const outputPath = path.join(iconsetDir, filename);

      await sharp(svgBuffer)
        .resize(actualSize, actualSize)
        .png()
        .toFile(outputPath);
    }

    // Convert iconset to .icns
    const icnsPath = path.join(buildDir, 'icon.icns');
    await execAsync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);

    console.log('   ✓ icon.icns generated successfully\n');

    // Clean up iconset directory
    fs.rmSync(iconsetDir, { recursive: true, force: true });

  } catch (error) {
    console.error('   ✗ Failed to generate .icns:', error.message, '\n');
  }
}

// Generate Windows .ico file
async function generateICO() {
  console.log('🪟 Generating Windows .ico file...');
  console.log('   ℹ️  Using PNG fallback (install ImageMagick for true .ico)\n');

  // For now, just copy the 256px icon as a fallback
  // True .ico generation requires ImageMagick or a specialized tool
  const sourceIcon = path.join(iconsDir, 'icon_256x256.png');
  const destIcon = path.join(buildDir, 'icon.ico');

  if (fs.existsSync(sourceIcon)) {
    fs.copyFileSync(sourceIcon, destIcon);
    console.log('   ✓ icon.ico created (PNG format)\n');
  }
}

// Main execution
(async () => {
  try {
    await generatePNGs();
    await generateICNS();
    await generateICO();

    console.log('✨ Icon generation complete!\n');
    console.log('📁 Generated files:');
    console.log(`   build/icon.png (1024x1024) - Main icon`);
    console.log(`   build/icon.icns - macOS app icon`);
    console.log(`   build/icon.ico - Windows app icon`);
    console.log(`   build/icons/ - PNG icons (various sizes)\n`);

  } catch (error) {
    console.error('❌ Error during icon generation:', error);
    process.exit(1);
  }
})();
