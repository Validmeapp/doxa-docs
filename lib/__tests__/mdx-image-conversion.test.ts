import { MDXProcessor } from '../mdx-processor';

describe('MDX Image Conversion', () => {
  let processor: MDXProcessor;

  beforeEach(() => {
    processor = new MDXProcessor();
  });

  describe('remarkImageConverter', () => {
    it('should convert standard Markdown images to DocImage components', async () => {
      const markdown = `
# Test Document

Here is an image:

![Alt text](./assets/images/screenshot.png)

And another with title:

![Another image](./assets/images/diagram.svg "Diagram title")
      `.trim();

      const result = await processor.processMarkdown(markdown);
      
      expect(result.processedContent).toContain('<DocImage src="./assets/images/screenshot.png" alt="Alt text" />');
      expect(result.processedContent).toContain('<DocImage src="./assets/images/diagram.svg" alt="Another image" title="Diagram title" />');
    });

    it('should preserve alt text and handle empty alt text', async () => {
      const markdown = `
![](./assets/images/no-alt.png)

![With alt text](./assets/images/with-alt.png)
      `.trim();

      const result = await processor.processMarkdown(markdown);
      
      expect(result.processedContent).toContain('<DocImage src="./assets/images/no-alt.png" alt="" />');
      expect(result.processedContent).toContain('<DocImage src="./assets/images/with-alt.png" alt="With alt text" />');
    });

    it('should not convert external images', async () => {
      const markdown = `
![External image](https://example.com/image.png)

![Data URI](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==)
      `.trim();

      const result = await processor.processMarkdown(markdown);
      
      // External images should remain as regular img tags
      expect(result.processedContent).not.toContain('<DocImage');
      expect(result.processedContent).toContain('<img');
    });

    it('should handle special characters in alt text and URLs', async () => {
      const markdown = `
![Alt with "quotes" & <brackets>](./assets/images/special-chars.png)

![Normal alt](./assets/images/file with spaces.png)
      `.trim();

      const result = await processor.processMarkdown(markdown);
      
      expect(result.processedContent).toContain('alt="Alt with &quot;quotes&quot; &amp; &lt;brackets&gt;"');
      expect(result.processedContent).toContain('src="./assets/images/file with spaces.png"');
    });

    it('should handle images in different contexts (lists, blockquotes)', async () => {
      const markdown = `
- Item with image: ![List image](./assets/images/list.png)

> Quote with image:
> ![Quote image](./assets/images/quote.png)

| Table | Cell |
|-------|------|
| ![Table image](./assets/images/table.png) | Content |
      `.trim();

      const result = await processor.processMarkdown(markdown);
      
      expect(result.processedContent).toContain('<DocImage src="./assets/images/list.png" alt="List image" />');
      expect(result.processedContent).toContain('<DocImage src="./assets/images/quote.png" alt="Quote image" />');
      expect(result.processedContent).toContain('<DocImage src="./assets/images/table.png" alt="Table image" />');
    });

    it('should preserve original attributes and metadata', async () => {
      const markdown = `
![Complex image](./assets/images/complex.png "Title with special chars: <>&\"'")
      `.trim();

      const result = await processor.processMarkdown(markdown);
      
      expect(result.processedContent).toContain('src="./assets/images/complex.png"');
      expect(result.processedContent).toContain('alt="Complex image"');
      expect(result.processedContent).toContain('title="Title with special chars: &lt;&gt;&amp;&quot;&#039;"');
    });
  });

  describe('remarkAssetLinkConverter', () => {
    it('should convert binary file links to DocAssetLink components', async () => {
      const markdown = `
Download the [user guide](./assets/files/guide.pdf).

Get the [data export](./assets/files/export.csv) file.

Install the [application](./assets/files/app.zip).
      `.trim();

      const result = await processor.processMarkdown(markdown);
      
      expect(result.processedContent).toContain('<DocAssetLink src="./assets/files/guide.pdf" download={true} showMetadata={true}>user guide</DocAssetLink>');
      expect(result.processedContent).toContain('<DocAssetLink src="./assets/files/export.csv" download={true} showMetadata={true}>data export</DocAssetLink>');
      expect(result.processedContent).toContain('<DocAssetLink src="./assets/files/app.zip" download={true} showMetadata={true}>application</DocAssetLink>');
    });

    it('should handle various binary file extensions', async () => {
      const markdown = `
- [PDF file](./file.pdf)
- [Excel file](./file.xlsx)
- [Word doc](./file.docx)
- [Archive](./file.tar.gz)
- [Database](./file.db)
- [JSON data](./file.json)
      `.trim();

      const result = await processor.processMarkdown(markdown);
      
      expect(result.processedContent).toContain('<DocAssetLink src="./file.pdf"');
      expect(result.processedContent).toContain('<DocAssetLink src="./file.xlsx"');
      expect(result.processedContent).toContain('<DocAssetLink src="./file.docx"');
      expect(result.processedContent).toContain('<DocAssetLink src="./file.tar.gz"');
      expect(result.processedContent).toContain('<DocAssetLink src="./file.db"');
      expect(result.processedContent).toContain('<DocAssetLink src="./file.json"');
    });

    it('should not convert regular internal links', async () => {
      const markdown = `
See the [getting started guide](/docs/getting-started).

Check out [this section](#section-header).

Visit [our homepage](/).
      `.trim();

      const result = await processor.processMarkdown(markdown);
      
      // These should remain as regular links
      expect(result.processedContent).not.toContain('<DocAssetLink');
      expect(result.processedContent).toContain('<a href="/docs/getting-started">getting started guide</a>');
      expect(result.processedContent).toContain('<a href="#section-header">this section</a>');
      expect(result.processedContent).toContain('<a href="/">our homepage</a>');
    });

    it('should not convert external links', async () => {
      const markdown = `
Download from [external site](https://example.com/file.pdf).

Email us at [support](mailto:support@example.com).
      `.trim();

      const result = await processor.processMarkdown(markdown);
      
      // External links should remain as regular links
      expect(result.processedContent).not.toContain('<DocAssetLink');
      expect(result.processedContent).toContain('<a href="https://example.com/file.pdf">external site</a>');
      expect(result.processedContent).toContain('<a href="mailto:support@example.com">support</a>');
    });

    it('should handle links with titles', async () => {
      const markdown = `
[Download guide](./guide.pdf "User Guide PDF")
      `.trim();

      const result = await processor.processMarkdown(markdown);
      
      expect(result.processedContent).toContain('<DocAssetLink src="./guide.pdf" download={true} showMetadata={true} title="User Guide PDF">Download guide</DocAssetLink>');
    });

    it('should handle empty link text', async () => {
      const markdown = `
[](./empty-text.pdf)
      `.trim();

      const result = await processor.processMarkdown(markdown);
      
      expect(result.processedContent).toContain('<DocAssetLink src="./empty-text.pdf" download={true} showMetadata={true} />');
    });

    it('should handle special characters in link text and URLs', async () => {
      const markdown = `
[Link with "quotes" & <brackets>](./assets/files/special-chars.pdf)

[Normal link](./assets/files/file with spaces.pdf)
      `.trim();

      const result = await processor.processMarkdown(markdown);
      
      expect(result.processedContent).toContain('>Link with &quot;quotes&quot; &amp; &lt;brackets&gt;</DocAssetLink>');
      expect(result.processedContent).toContain('src="./assets/files/file with spaces.pdf"');
    });
  });

  describe('Backward compatibility', () => {
    it('should not break existing content without assets', async () => {
      const markdown = `
# Regular Content

This is a regular paragraph with [internal link](/docs/other-page).

## Code Example

\`\`\`javascript
console.log('Hello world');
\`\`\`

- List item 1
- List item 2

> This is a blockquote
      `.trim();

      const result = await processor.processMarkdown(markdown);
      
      // Should process normally without errors
      expect(result.processedContent).toContain('<h1');
      expect(result.processedContent).toContain('<a href="/docs/other-page">internal link</a>');
      expect(result.processedContent).toContain('console.log');
      expect(result.processedContent).toContain('<ul>');
      expect(result.processedContent).toContain('<blockquote>');
      expect(result.linkValidationErrors).toBeDefined();
      expect(result.tableOfContents).toBeDefined();
    });

    it('should handle mixed content with both regular and asset links', async () => {
      const markdown = `
# Mixed Content

Regular [internal link](/docs/guide) and [external link](https://example.com).

Asset links: [PDF guide](./guide.pdf) and [data file](./data.csv).

Images: ![Regular image](./image.png) and external ![External](https://example.com/img.png).
      `.trim();

      const result = await processor.processMarkdown(markdown);
      
      // Regular links should remain unchanged
      expect(result.processedContent).toContain('<a href="/docs/guide">internal link</a>');
      expect(result.processedContent).toContain('<a href="https://example.com">external link</a>');
      
      // Asset links should be converted
      expect(result.processedContent).toContain('<DocAssetLink src="./guide.pdf"');
      expect(result.processedContent).toContain('<DocAssetLink src="./data.csv"');
      
      // Local images should be converted, external should not
      expect(result.processedContent).toContain('<DocImage src="./image.png"');
      expect(result.processedContent).toContain('<img src="https://example.com/img.png"');
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed markdown gracefully', async () => {
      const markdown = `
![Unclosed image](./image.png

[Unclosed link](./file.pdf

![](./empty-alt.png)

[]()
      `.trim();

      // Should not throw errors
      const result = await processor.processMarkdown(markdown);
      expect(result.processedContent).toBeDefined();
    });

    it('should handle nested markdown structures', async () => {
      const markdown = `
1. First item with ![image](./img1.png)
   - Nested item with [file](./file.pdf)
   - Another nested item

2. Second item with [another file](./file2.zip)
      `.trim();

      const result = await processor.processMarkdown(markdown);
      
      expect(result.processedContent).toContain('<DocImage src="./img1.png"');
      expect(result.processedContent).toContain('<DocAssetLink src="./file.pdf"');
      expect(result.processedContent).toContain('<DocAssetLink src="./file2.zip"');
    });
  });
});