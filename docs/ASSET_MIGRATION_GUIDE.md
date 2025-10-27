# Asset Management Migration Guide

This guide helps content authors understand the new asset management system and how to migrate existing content.

## Overview

The new asset management system automatically converts standard Markdown image and link syntax to optimized components:

- **Images**: `![alt](src)` → `<DocImage />` component
- **Binary files**: `[text](file.pdf)` → `<DocAssetLink />` component

## What Changed

### Automatic Conversions

The MDX processor now automatically converts:

1. **Local images** to `DocImage` components for optimization
2. **Binary file links** to `DocAssetLink` components with metadata

### What Stays the Same

- External images and links remain unchanged
- Internal page links remain unchanged
- All existing Markdown syntax continues to work
- Code blocks, tables, lists, etc. work exactly as before

## Migration Steps

### 1. No Action Required for Most Content

Your existing content will continue to work without any changes. The system automatically handles conversions.

### 2. Organize Your Assets (Recommended)

For better organization, consider moving assets to the recommended structure:

```
content/
├── en/
│   └── v1/
│       ├── assets/
│       │   ├── images/
│       │   │   ├── screenshot.png
│       │   │   └── diagram.svg
│       │   └── files/
│       │       ├── guide.pdf
│       │       └── data.csv
│       └── docs/
│           └── your-content.mdx
```

### 3. Update Asset References (Optional)

You can update your asset references to use the new structure:

**Before:**
```markdown
![Screenshot](../../../assets/screenshot.png)
[Download guide](../../../files/guide.pdf)
```

**After:**
```markdown
![Screenshot](./assets/images/screenshot.png)
[Download guide](./assets/files/guide.pdf)
```

## Supported File Types

### Images (Auto-converted to DocImage)

- `.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`, `.gif`, `.svg`

**Features:**
- Automatic optimization
- Responsive variants (@1x, @2x)
- Modern format conversion (WebP, AVIF)
- Lazy loading
- Proper alt text handling

### Binary Files (Auto-converted to DocAssetLink)

- **Documents**: `.pdf`, `.doc`, `.docx`
- **Spreadsheets**: `.xls`, `.xlsx`, `.csv`
- **Archives**: `.zip`, `.tar`, `.gz`, `.rar`, `.7z`
- **Data**: `.json`, `.xml`, `.sql`, `.db`
- **Executables**: `.exe`, `.dmg`, `.pkg`, `.deb`, `.rpm`

**Features:**
- File size display
- File type indication
- Download behavior
- Security validation
- Metadata extraction

## Examples

### Image Conversion

**Markdown:**
```markdown
![API Flow Diagram](./assets/images/api-flow.png "API Request Flow")
```

**Converts to:**
```html
<DocImage src="./assets/images/api-flow.png" alt="API Flow Diagram" title="API Request Flow" />
```

**Result:**
- Optimized loading with Next.js Image
- Responsive variants generated
- Proper accessibility attributes

### Binary File Conversion

**Markdown:**
```markdown
Download the [API specification](./assets/files/api-spec.pdf) for complete details.
```

**Converts to:**
```html
<DocAssetLink src="./assets/files/api-spec.pdf" download={true} showMetadata={true}>API specification</DocAssetLink>
```

**Result:**
- Shows file type and size
- Proper download behavior
- Security validation

### Mixed Content Example

```markdown
# Getting Started

Follow these steps:

1. Read the [user guide](./assets/files/guide.pdf)
2. View the setup diagram:
   ![Setup Diagram](./assets/images/setup.png)
3. Visit our [main site](https://example.com) for more info

## Code Example

```javascript
console.log('This still works normally');
```
```

## What Doesn't Convert

### External Resources
```markdown
![External image](https://example.com/image.png)
[External file](https://example.com/file.pdf)
```
These remain as regular HTML elements.

### Internal Page Links
```markdown
[Other page](/docs/other-page)
[Section link](#section)
```
These remain as regular anchor tags.

### Non-Binary Files
```markdown
[Text file](./file.txt)
[HTML file](./page.html)
```
Only specific binary file types are converted.

## Troubleshooting

### Asset Not Found

If you see "Asset not available" in the rendered output:

1. Check the file path is correct
2. Ensure the file exists in the content directory
3. Verify the file extension is supported
4. Check the asset was processed during build

### Image Not Loading

If images show a placeholder:

1. Verify the image file exists
2. Check the file format is supported
3. Ensure the image isn't corrupted
4. Check browser console for errors

### Download Not Working

If binary file downloads fail:

1. Verify the file path is correct
2. Check the file was processed during build
3. Ensure the file type is supported
4. Check browser network tab for errors

## Best Practices

### 1. Use Descriptive Alt Text
```markdown
<!-- Good -->
![API request flow showing client, server, and database interactions](./diagram.png)

<!-- Avoid -->
![Diagram](./diagram.png)
```

### 2. Organize Assets Logically
```
assets/
├── images/
│   ├── screenshots/
│   ├── diagrams/
│   └── icons/
└── files/
    ├── guides/
    ├── templates/
    └── data/
```

### 3. Use Meaningful File Names
```markdown
<!-- Good -->
![User registration flow](./assets/images/user-registration-flow.png)
[API Reference PDF](./assets/files/api-reference-v1.pdf)

<!-- Avoid -->
![Image](./assets/images/img1.png)
[File](./assets/files/doc.pdf)
```

### 4. Keep File Sizes Reasonable
- Images: < 2MB (will be optimized automatically)
- Binary files: < 10MB
- Use appropriate image formats (PNG for screenshots, SVG for diagrams)

## Testing Your Content

After making changes, test your content:

1. **Build locally**: Run `npm run build` to process assets
2. **Check console**: Look for any asset processing errors
3. **Test in browser**: Verify images load and downloads work
4. **Check accessibility**: Ensure alt text is meaningful

## Getting Help

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Review the console for error messages
3. Verify your file paths and organization
4. Contact the development team for assistance

## Summary

The new asset management system:

✅ **Automatically converts** local images and binary files  
✅ **Maintains backward compatibility** with existing content  
✅ **Improves performance** with optimized loading  
✅ **Enhances security** with file validation  
✅ **Provides better UX** with metadata display  

No immediate action is required, but following the best practices will help you get the most out of the new system.