import Story from '../models/Story.js';
import ScriptVersion from '../models/ScriptVersion.js';

/** Strip HTML tags for plain text (script content may be HTML). */
function stripHtml(html) {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Export story as HTML (comments/fact-checks excluded). Word can open .html. */
export const exportHtml = async (req, res, next) => {
  try {
    const storyQuery = { _id: req.params.storyId, deletedAt: null };
    if (req.workspaceId) {
      storyQuery.workspaceId = req.workspaceId;
    }
    const story = await Story.findOne(storyQuery);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    let scriptContent = '';
    const current = await ScriptVersion.findOne({
      storyId: story._id,
      outputId: null,
      version: 0,
    });
    if (current?.content) {
      scriptContent = stripHtml(current.content);
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(story.headline)}</title></head>
<body>
<h1>${escapeHtml(story.headline)}</h1>
<h2>Description</h2>
<p>${escapeHtml(story.description)}</p>
<h2>Script</h2>
<p>${escapeHtml(scriptContent || '(No script content)')}</p>
</body>
</html>`;

    const filename = `story-${story.headline.slice(0, 50).replace(/[^a-zA-Z0-9-_]/g, '-')}.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(html);
  } catch (err) {
    next(err);
  }
};

/** Export story as DOCX (requires docx package). */
export const exportDocx = async (req, res, next) => {
  try {
    let docx;
    try {
      docx = await import('docx');
    } catch {
      return res.status(501).json({ error: 'DOCX export requires: npm install docx (in server)' });
    }

    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
    const storyQuery = { _id: req.params.storyId, deletedAt: null };
    if (req.workspaceId) {
      storyQuery.workspaceId = req.workspaceId;
    }
    const story = await Story.findOne(storyQuery);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    let scriptContent = '';
    const current = await ScriptVersion.findOne({
      storyId: story._id,
      outputId: null,
      version: 0,
    });
    if (current?.content) {
      scriptContent = stripHtml(current.content);
    }

    const children = [
      new Paragraph({
        text: story.headline,
        heading: HeadingLevel.TITLE,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: 'Description',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: story.description, break: 1 })],
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: 'Script',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: scriptContent || '(No script content)', break: 1 })],
      }),
    ];

    const doc = new Document({
      sections: [{ children }],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `story-${story.headline.slice(0, 50).replace(/[^a-zA-Z0-9-_]/g, '-')}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};
