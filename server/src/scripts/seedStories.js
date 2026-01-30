/**
 * Seed script: creates 50 example stories distributed across workflow states.
 * Run from project root: npm run seed:stories (from server dir) or node server/src/scripts/seedStories.js
 * Requires at least one user in the database (run seed:users first).
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(rootDir, '.env') });

import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import User from '../models/User.js';
import Story from '../models/Story.js';

const STATES = ['idea', 'research', 'scripting', 'multimedia', 'finalization', 'published', 'archived'];
const CATEGORIES = ['Politics', 'Environment', 'Health', 'Education', 'Economy', 'Culture', 'Sports', 'Housing', 'Crime', 'Technology'];

function desc(text) {
  const t = text.trim();
  if (t.length >= 140) return t;
  return t + ' (This sentence ensures the description meets the minimum length requirement.)';
}

const PARENT_DESCRIPTION_PLACEHOLDER =
  'Story package – no script or long description. Use this to group related stories (e.g. Update, Educational follow-up, Commentary). Minimum length for schema.';

const STORY_TEMPLATES = [
  // IDEA (9)
  { headline: 'Local renewable energy initiative proposal', description: desc('Pitch: coverage of a proposed municipal renewable energy initiative and community feedback. We would interview council members and residents to gauge support and feasibility.') },
  { headline: 'School district curriculum changes 2025', description: desc('Idea: follow the school district\'s planned curriculum review and how new standards might affect teachers and students. Potential for a multi-part series.') },
  { headline: 'Small business recovery after pandemic', description: desc('Angle: how small businesses in the downtown corridor have adapted post-pandemic, including new policies and remaining challenges. Human interest focus.') },
  { headline: 'Public transport expansion plans', description: desc('Concept: transit authority is considering new routes and frequency increases. We could cover the consultation process and projected impact on commuters.') },
  { headline: 'Youth mental health services gap', description: desc('Pitch: advocates report a shortage of youth mental health services. Story would highlight wait times, demand, and one family\'s experience. We\'ll include data and voices.') },
  { headline: 'Historic building preservation debate', description: desc('Idea: a century-old building may be demolished for development. We would present both preservation and development perspectives and council timeline.') },
  { headline: 'Community garden network growth', description: desc('Angle: the number of community gardens has doubled in five years. Feature on volunteers, food access, and city support.') },
  { headline: 'Local election voter turnout analysis', description: desc('Concept: analyze turnout by district and demographics from the last local election, with expert commentary on trends and barriers.') },
  { headline: 'River water quality monitoring results', description: desc('Pitch: annual water quality report is due. We could explain key indicators, compare to previous years, and interview environmental officials.') },
  // RESEARCH (9)
  { headline: 'City budget deficit and service cuts', description: desc('We are researching the projected deficit, proposed cuts, and which departments are most affected. Council documents and finance committee meetings are primary sources.') },
  { headline: 'Hospital emergency room wait times', description: desc('Research underway on ER wait time data, staffing levels, and patient experiences. We have requested statistics from the health authority and are scheduling clinician interviews.') },
  { headline: 'Homelessness count methodology and results', description: desc('Reviewing how the annual point-in-time count is conducted and what the latest numbers show. We are gathering historical data and expert analysis.') },
  { headline: 'New housing development environmental impact', description: desc('Assessing the environmental review for the proposed development: traffic, green space, and runoff. We are reading the EIA and contacting relevant agencies.') },
  { headline: 'Police use-of-force incidents and policy', description: desc('Compiling data on use-of-force reports and policy changes over the past five years. We have filed records requests and are reviewing policy documents.') },
  { headline: 'Teacher retention and burnout survey', description: desc('Gathering survey data and interviews with teachers and union representatives on workload and retention. Research phase includes district response.') },
  { headline: 'Food bank demand and supply trends', description: desc('Tracking food bank usage, donations, and costs. We are collecting monthly stats and interviewing staff and clients for context.') },
  { headline: 'Cycling infrastructure safety audit', description: desc('Reviewing crash data and user feedback on bike lanes and shared paths. We are mapping incident locations and speaking with advocacy groups.') },
  { headline: 'Library funding and branch hours', description: desc('Researching library budget, branch hours before and after cuts, and usage patterns. We have requested internal reports and will interview library leadership.') },
  // SCRIPTING (8)
  { headline: 'Interview: Mayor on second-term priorities', description: desc('Script in progress. Mayor interview covers housing, transit, and public safety. We are structuring around three themes and pulling key quotes for the piece.') },
  { headline: 'Explainer: How property tax is calculated', description: desc('Draft script explains assessment, mill rate, and exemptions in plain language. We are adding local examples and a simple breakdown graphic.') },
  { headline: 'Profile: Long-serving fire chief retires', description: desc('Script draft focuses on career highlights, major incidents, and legacy. We are fact-checking dates and adding quotes from colleagues and family.') },
  { headline: 'Council vote on zoning amendment', description: desc('Script outlines the amendment, who voted for and against, and what it means for the neighborhood. We are tightening the lede and adding reaction quotes.') },
  { headline: 'Local artist wins national recognition', description: desc('Feature script covers the artist\'s background, the award, and their plans. We are weaving in descriptions of their work and studio visit details.') },
  { headline: 'Flood preparedness and insurance gaps', description: desc('Script explains flood risk in the region, insurance limitations, and what residents can do. We are adding expert quotes and a checklist.') },
  { headline: 'School nutrition program expansion', description: desc('Story script covers the new program rollout, funding, and early feedback from schools. We are balancing data with on-the-ground voices.') },
  { headline: 'Crime stats and community safety perceptions', description: desc('Script compares official crime statistics with community survey results and expert interpretation. We are ensuring clarity on definitions and time frames.') },
  // MULTIMEDIA (8)
  { headline: 'Documentary clip: Day in the life of paramedics', description: desc('We are editing the paramedic ride-along footage and selecting clips for the main piece. B-roll and interviews are being synced; music and captions next.') },
  { headline: 'Photo essay: Changing face of the waterfront', description: desc('Photo selection and sequencing in progress. We have before-and-after shots and new development images; captions and intro text are being finalized.') },
  { headline: 'Podcast: Local election roundtable', description: desc('Recording is done; we are editing the roundtable discussion and adding intro/outro. Transcript and show notes will be prepared for publication.') },
  { headline: 'Video explainer: Recycling rules update', description: desc('Animation and voiceover are in progress. We are aligning visuals with the new rules and scheduling a review with the waste management office.') },
  { headline: 'Interactive map: Park accessibility', description: desc('Map layer and filters are being built. We are verifying data for each park and writing short descriptions for the interactive tool.') },
  { headline: 'Audio story: Immigrant family business legacy', description: desc('Interview audio is being mixed with ambient sound. We are trimming for length and preparing a text version for accessibility.') },
  { headline: 'Gallery: Winter festival highlights', description: desc('Photo gallery is curated; we are editing captions and adding a short video clip from the opening ceremony. Publish date aligned with social push.') },
  { headline: 'Video: Protest and policy reaction', description: desc('Footage from the protest and official statements are being cut together. We are ensuring balance and adding context cards for key facts.') },
  // FINALIZATION (8)
  { headline: 'Breaking: Major employer announces layoffs', description: desc('Story is in final edit. We have company statement, union response, and expert comment. Final fact-check and legal review before publish.') },
  { headline: 'Investigation: Contract oversight gaps', description: desc('Long-form piece is in final review. Sourcing and documents have been verified; we are doing a last pass on tone and clarity before publication.') },
  { headline: 'Election night results wrap', description: desc('Template and key races are set. We are preparing live updates and a results summary; will be finalized once numbers are certified.') },
  { headline: 'Holiday charity drive impact', description: desc('Final draft is with the editor. Figures from charities and beneficiary quotes are in place; we are confirming totals and publish timing.') },
  { headline: 'Year in review: Top 10 stories', description: desc('Selections are locked; intros and links are being polished. Final check on dates and accuracy before the year-end publish.') },
  { headline: 'New hospital wing opening', description: desc('Story is in finalization. We have ribbon-cutting details, facility tour, and staff quotes. Photo selection and caption review in progress.') },
  { headline: 'Tax filing deadline reminders', description: desc('Service piece is in final edit. Deadlines and resources have been double-checked; we are adding a short expert tip and then clearing for publish.') },
  { headline: 'Community awards ceremony coverage', description: desc('Final draft includes winner list, photos, and quotes from organizers. We are confirming spellings and titles before release.') },
  // PUBLISHED (8)
  { headline: 'Weekend weather and events roundup', description: desc('Published. This week\'s roundup included forecast, road conditions, and a list of community events. Reader feedback was positive; we may make it a regular feature.') },
  { headline: 'Local team advances to regional finals', description: desc('Published. We covered the semifinal result, key plays, and coach and player reactions. Story was widely shared on social media.') },
  { headline: 'New café opens in historic district', description: desc('Published. The piece featured the owner\'s story, menu highlights, and the building\'s history. Café reported a bump in weekend visitors.') },
  { headline: 'Traffic pattern change on Main Street', description: desc('Published. We explained the new pattern, start date, and where to find updates. Traffic department thanked us for clear communication.') },
  { headline: 'Volunteer recognition event coverage', description: desc('Published. We listed award winners and featured short profiles. Several nonprofits requested links for their newsletters.') },
  { headline: 'Utility rate increase approved', description: desc('Published. Story covered the vote, new rates, and rationale. We linked to the full rate schedule and received few follow-up questions.') },
  { headline: 'Library summer reading program launch', description: desc('Published. We announced the program, dates, and how to sign up. Library staff said registration increased after the story ran.') },
  { headline: 'Obituary: Civic leader and philanthropist', description: desc('Published. Obituary covered their career, civic contributions, and family. We followed style guide and received approval from the family.') },
];

async function seed() {
  await connectDB();

  const user = await User.findOne().select('_id').lean();
  if (!user) {
    console.error('No user found. Run seed:users first to create Editor and Producer.');
    await mongoose.connection.close();
    process.exit(1);
  }
  const createdBy = user._id;

  const stateCounts = {};
  STATES.forEach((s) => (stateCounts[s] = 0));

  const createdStoryIds = [];

  function stateForIndex(i) {
    if (i < 9) return 'idea';
    if (i < 18) return 'research';
    if (i < 26) return 'scripting';
    if (i < 34) return 'multimedia';
    if (i < 42) return 'finalization';
    return 'published';
  }

  for (let i = 0; i < STORY_TEMPLATES.length; i++) {
    const t = STORY_TEMPLATES[i];
    const state = stateForIndex(i);
    stateCounts[state] = (stateCounts[state] || 0) + 1;

    const numCategories = (i % 3) + 1;
    const categories = CATEGORIES.slice(i % (CATEGORIES.length - 2), i % (CATEGORIES.length - 2) + numCategories);

    const story = {
      headline: t.headline,
      description: t.description,
      state,
      createdBy,
      categories,
      researchNotes: state === 'research' ? 'Ongoing research; sources and data being gathered.' : undefined,
      currentScriptVersion: ['scripting', 'multimedia', 'finalization', 'published'].includes(state) ? 1 : 0,
    };

    if (state === 'idea' || state === 'research') {
      story.approved = false;
    } else {
      story.approved = true;
      story.approvedBy = createdBy;
      story.approvedAt = new Date(Date.now() - (50 - i) * 24 * 60 * 60 * 1000);
    }

    if (state === 'published') {
      story.publishedAt = new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000);
      story.cycleTimeDays = 3 + (i % 10);
    }

    if (i % 4 === 0 && !['idea', 'published'].includes(state)) {
      const d = new Date();
      d.setDate(d.getDate() + 5 + (i % 7));
      story.deadlines = [
        { name: 'Draft deadline', date: d, notifications: { hours_24: true, hours_1: false }, completed: false },
      ];
    }

    const doc = await Story.create(story);
    createdStoryIds.push(doc._id);
  }

  // Create parent stories (packages) and link some child stories
  const parentTitles = [
    'Housing series Q1 – updates and follow-ups',
    'Health services coverage package',
    'Local election 2025 – stories and commentary',
  ];
  for (const headline of parentTitles) {
    const parent = await Story.create({
      headline,
      description: PARENT_DESCRIPTION_PLACEHOLDER,
      state: 'idea',
      kind: 'parent',
      createdBy,
      categories: ['Series'],
    });
    // Link 4 child stories each (use existing stories by index)
    const startIdx = (parentTitles.indexOf(headline)) * 4;
    const childIds = createdStoryIds.slice(startIdx, startIdx + 4).filter(Boolean);
    for (const childId of childIds) {
      await Story.findByIdAndUpdate(childId, { parentStoryId: parent._id });
      if (!parent.childOrder) parent.childOrder = [];
      parent.childOrder.push(childId);
    }
    await parent.save();
  }

  console.log('Created 50 stories.');
  console.log('Created 3 parent story packages and linked 4 child stories to each.');
  console.log('By state:', stateCounts);
  console.log('Seed complete.');
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
