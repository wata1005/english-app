# Can-do Catalog v1

These are **app-defined**, age-appropriate observable descriptors informed by CEFR's action-oriented approach. They are not official CEFR descriptors and cannot confer CEFR levels.

## IDs and evidence rules
`L{level}_{skill}_{number}` where skill = `LI` listening, `SP` speaking, `RE` reading, `WR` writing. Evidence must include task, timestamp, scene, support level, verification method, success/uncertainty. Separate exposure, supported completion, independently demonstrated competence and unknown (ASR error). A single success never means mastered.

| ID | Level | Can-do | Evidence example | Verified when |
|---|---|---|---|---|
| L1_LI_01 | 1 | Identify a familiar object from English speech | `Find the dog` among dog/cat/bear | Correct choice after audio, without visible label or demonstration |
| L1_LI_02 | 1 | Follow one spoken action | `Jump`, `Stop`, `Touch the star` | Correct action, with alternative targets |
| L1_SP_01 | 1 | Join an English greeting routine | `Hello`, `Bye` in social play | Audio confirmed or adult observation; ASR failure unknown |
| L1_RE_01 | 1 | Notice spoken word/printed symbol association | Match repeated sound to displayed letter with picture support | Sound-based discrimination; exposure alone not mastery |
| L1_WR_01 | 1 | Communicate with a purposeful stamp | Send a happy/thank-you stamp to a character | Appropriate selection and delivery; *emergent writing*, not CEFR writing |
| L2_LI_01 | 2 | Follow location/action instruction | `Put the apple in the box` | Correct drag/drop with distractors |
| L2_LI_02 | 2 | Distinguish attributes in spoken requests | `Find the small blue star` | Correct among color/size contrasts |
| L2_SP_01 | 2 | Make a simple request | `Cake, please`, `I want cake` | Intent understood; independent verified speech where possible |
| L2_SP_02 | 2 | Respond to a familiar question | `What do you want?` | Relevant meaningful response |
| L2_RE_01 | 2 | Associate common phonemes and graphemes | Identify /m/ from choices | Audio-led phonics discrimination |
| L2_WR_01 | 2 | Make a meaningful short message | Arrange icon/word tiles to request a gift | Recipient responds to meaning |
| L3_LI_01 | 3 | Follow two connected spoken actions | `Get the key, then open the door` | Correct order without visual answer cues |
| L3_SP_01 | 3 | Describe an action in a scene | `The bear is sleeping` | Semantic match to moving scene |
| L3_SP_02 | 3 | Describe a location | `The ball is under the table` | Distinguishes under/on/in in context |
| L3_RE_01 | 3 | Blend sounds to decode a short word | /c/ /a/ /t/ -> cat | Unfamiliar item, no picture shortcut |
| L3_RE_02 | 3 | Follow a short narrated story | Sequence three pictured events | Listening comprehension; not independent reading |
| L3_WR_01 | 3 | Compose a short meaningful phrase | Word tiles `I like cats` | Appropriate recipient response |
| L4_LI_01 | 4 | Understand a short task narrative | Choose action after 2-3 utterances | Correct novel scenario action |
| L4_SP_01 | 4 | Give a simple reason | `I like it because it's big` | Meaningful reason, not exact sentence repetition |
| L4_SP_02 | 4 | Ask a familiar question | `Where is the key?` | Partner responds to requested information |
| L4_RE_01 | 4 | Read a short decodable sentence | Independently read `The cat is on the mat` | Separate from narrated book mode |
| L4_WR_01 | 4 | Construct a short message with purpose | Tiles, dictation or optional handwriting | Meaning communicated; mode tagged |

## Coverage and promotion
Use explicit `required` flag per Can-do and per-skill progress. Promotion recommendation: >=80% required Can-dos mastered AND all critical L1/L2 listening/speaking descriptors mastered, with parent override permitted. Do not block exploration or story access based on reading/writing maturation. Denominators count *eligible required* Can-dos; `not_assessed` is not zero ability. Do not represent internal progress as IELTS band or CEFR certification.

## Mastery evidence
Candidate after aggregate >=85/100 with all four components assessed; mastered only after >=3 independent successful attempts on >=2 calendar dates and >=2 different scene IDs, with latest probe without substantive hint. If a child cannot use ASR, support adult-verified observation and mark evidence method; do not falsely label it machine verified. Record confidence/verification method and report limits to parent.
