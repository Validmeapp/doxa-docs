#!/usr/bin/env tsx

/**
 * Create sample assets for testing the asset pipeline
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const CONTENT_DIR = path.join(process.cwd(), 'content');

interface AssetConfig {
  locale: string;
  version: string;
}

async function createSampleImage(
  config: AssetConfig,
  filename: string,
  width: number,
  height: number,
  color: { r: number; g: number; b: number },
  text: string
): Promise<void> {
  const outputDir = path.join(CONTENT_DIR, config.locale, config.version, 'assets', 'images');
  await fs.mkdir(outputDir, { recursive: true });

  // Create a simple colored image with text overlay
  const svgText = `
    <svg width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="rgb(${color.r},${color.g},${color.b})"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 10}" fill="white">
        ${text}
      </text>
      <text x="50%" y="70%" dominant-baseline="middle" text-anchor="middle"
            font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 15}" fill="rgba(255,255,255,0.7)">
        ${width}x${height}
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svgText))
    .png()
    .toFile(path.join(outputDir, filename));

  console.log(`  Created: ${config.locale}/${config.version}/assets/images/${filename}`);
}

async function createSampleSVG(
  config: AssetConfig,
  filename: string
): Promise<void> {
  const outputDir = path.join(CONTENT_DIR, config.locale, config.version, 'assets', 'images');
  await fs.mkdir(outputDir, { recursive: true });

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="20" fill="url(#gradient)"/>
  <text x="100" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="white" font-weight="bold">VALIDME</text>
  <text x="100" y="115" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.8)">Documentation</text>
  <circle cx="100" cy="150" r="20" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="2"/>
  <text x="100" y="156" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="white">✓</text>
</svg>`;

  await fs.writeFile(path.join(outputDir, filename), svgContent, 'utf-8');
  console.log(`  Created: ${config.locale}/${config.version}/assets/images/${filename}`);
}

async function createSampleCSV(
  config: AssetConfig,
  filename: string
): Promise<void> {
  const outputDir = path.join(CONTENT_DIR, config.locale, config.version, 'assets', 'files');
  await fs.mkdir(outputDir, { recursive: true });

  const csvContent = config.locale === 'es'
    ? `nombre,correo,rol,fecha_registro
Juan García,juan@ejemplo.com,admin,2025-01-01
María López,maria@ejemplo.com,usuario,2025-01-02
Carlos Ruiz,carlos@ejemplo.com,editor,2025-01-03
Ana Martínez,ana@ejemplo.com,usuario,2025-01-04
Pedro Sánchez,pedro@ejemplo.com,moderador,2025-01-05`
    : `name,email,role,registration_date
John Smith,john@example.com,admin,2025-01-01
Jane Doe,jane@example.com,user,2025-01-02
Bob Wilson,bob@example.com,editor,2025-01-03
Alice Brown,alice@example.com,user,2025-01-04
Charlie Davis,charlie@example.com,moderator,2025-01-05`;

  await fs.writeFile(path.join(outputDir, filename), csvContent, 'utf-8');
  console.log(`  Created: ${config.locale}/${config.version}/assets/files/${filename}`);
}

async function createSampleJSON(
  config: AssetConfig,
  filename: string
): Promise<void> {
  const outputDir = path.join(CONTENT_DIR, config.locale, config.version, 'assets', 'files');
  await fs.mkdir(outputDir, { recursive: true });

  const jsonContent = config.locale === 'es'
    ? {
        nombre: 'Ejemplo de Configuración API',
        version: '1.0.0',
        endpoints: {
          usuarios: '/api/v1/usuarios',
          verificacion: '/api/v1/verificacion',
          documentos: '/api/v1/documentos'
        },
        configuracion: {
          tiempo_espera: 30000,
          reintentos: 3,
          modo_debug: false
        }
      }
    : {
        name: 'Sample API Configuration',
        version: '1.0.0',
        endpoints: {
          users: '/api/v1/users',
          verification: '/api/v1/verification',
          documents: '/api/v1/documents'
        },
        settings: {
          timeout: 30000,
          retries: 3,
          debug: false
        }
      };

  await fs.writeFile(
    path.join(outputDir, filename),
    JSON.stringify(jsonContent, null, 2),
    'utf-8'
  );
  console.log(`  Created: ${config.locale}/${config.version}/assets/files/${filename}`);
}

async function createSampleTextFile(
  config: AssetConfig,
  filename: string
): Promise<void> {
  const outputDir = path.join(CONTENT_DIR, config.locale, config.version, 'assets', 'files');
  await fs.mkdir(outputDir, { recursive: true });

  const textContent = config.locale === 'es'
    ? `# Guía de Inicio Rápido

## Paso 1: Obtener Credenciales
Regístrese en el portal de desarrolladores para obtener su API key.

## Paso 2: Configurar el Cliente
Instale el SDK e inicialice con sus credenciales.

## Paso 3: Hacer su Primera Solicitud
Use el endpoint de verificación para validar su configuración.

---
Documento generado automáticamente.
Versión: 1.0.0
Fecha: ${new Date().toISOString().split('T')[0]}`
    : `# Quick Start Guide

## Step 1: Get Credentials
Sign up at the developer portal to obtain your API key.

## Step 2: Configure the Client
Install the SDK and initialize with your credentials.

## Step 3: Make Your First Request
Use the verification endpoint to validate your setup.

---
Auto-generated document.
Version: 1.0.0
Date: ${new Date().toISOString().split('T')[0]}`;

  await fs.writeFile(path.join(outputDir, filename), textContent, 'utf-8');
  console.log(`  Created: ${config.locale}/${config.version}/assets/files/${filename}`);
}

async function main(): Promise<void> {
  console.log('🖼️  Creating sample assets...\n');

  const configs: AssetConfig[] = [
    { locale: 'en', version: 'v1' },
    { locale: 'es', version: 'v1' }
  ];

  for (const config of configs) {
    console.log(`📁 ${config.locale}/${config.version}:`);

    // Create sample images
    await createSampleImage(config, 'api-flow-diagram.png', 800, 400, { r: 59, g: 130, b: 246 }, 'API Flow Diagram');
    await createSampleImage(config, 'dashboard-screenshot.png', 1200, 675, { r: 79, g: 70, b: 229 }, 'Dashboard Screenshot');
    await createSampleImage(config, 'verification-process.png', 600, 400, { r: 16, g: 185, b: 129 }, 'Verification Process');
    await createSampleSVG(config, 'logo.svg');

    // Create sample binary files
    await createSampleCSV(config, 'sample-users.csv');
    await createSampleJSON(config, 'api-config.json');
    await createSampleTextFile(config, 'quickstart-guide.txt');

    console.log('');
  }

  console.log('✅ Sample assets created successfully!\n');
  console.log('Next steps:');
  console.log('  1. Run: npm run build:optimized (or tsx scripts/process-assets.ts)');
  console.log('  2. Check public/assets/ for processed files');
  console.log('  3. View public/assets/assets-manifest.json for the manifest\n');
}

main().catch(error => {
  console.error('Failed to create sample assets:', error);
  process.exit(1);
});
