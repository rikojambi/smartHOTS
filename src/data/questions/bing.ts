import type { SeedInput } from '../seedTypes'

export const BING: SeedInput[] = [
  {
    code: 'BING-01', subjectId: 'BING', topicId: 'bing-1', subTopic: 'Thesis',
    cognitive: 'C4', difficulty: 'sedang', type: 'single',
    stimulus: 'Text: "Plastic bags should be banned in schools. They pollute the environment and take hundreds of years to decompose. Therefore, every student should bring a reusable bag."',
    prompt: 'Which sentence is the thesis of the analytical exposition text?',
    options: ['They pollute the environment.', 'Plastic bags should be banned in schools.', 'They take hundreds of years to decompose.', 'Every student should bring a reusable bag.', 'Therefore, schools must act immediately.'],
    answer: 'B',
    explanation: 'The thesis states the writer’s position or main argument. "Plastic bags should be banned in schools" expresses the stance; the following sentences give arguments and recommendation.',
    reasons: ['This is an argument supporting the thesis.', 'Correct: it states the writer’s position.', 'This is another supporting argument.', 'This is a recommendation, not the main stance.', 'This is a reiteration/closing statement.'],
    indicator: 'Identifying the thesis statement in an analytical exposition text',
    competency: 'Text structure analysis', misconception: 'Mistaking the first supporting argument for the thesis.', recommendation: 'Practice distinguishing thesis, arguments, and recommendation in short expositions.'
  },
  {
    code: 'BING-02', subjectId: 'BING', topicId: 'bing-1', subTopic: 'Arguments',
    cognitive: 'C5', difficulty: 'sulit', type: 'single',
    stimulus: 'An argument says: "Online learning is ineffective because many students feel bored." A second argument says: "A 2024 survey of 300 students showed that 68% scored lower in online quizzes than in classroom quizzes."',
    prompt: 'Which evaluation of the arguments is most accurate?',
    options: ['The first argument is stronger because it is shorter.', 'The second argument is stronger because it uses specific evidence.', 'Both arguments are equally weak.', 'The first argument is factual because many students feel bored.', 'The second argument is irrelevant to learning outcomes.'],
    answer: 'B',
    explanation: 'The second argument uses a measurable survey with sample size and comparable results, making it more credible than a general feeling without data.',
    reasons: ['Brevity does not determine strength.', 'Correct: specific data makes the argument more convincing.', 'The second argument is actually strong.', 'A feeling is not the same as verified data.', 'Quiz scores are directly related to learning outcomes.'],
    indicator: 'Evaluating the quality of evidence in an argumentative text',
    competency: 'Critical evaluation of arguments', misconception: 'Equating personal experience with empirical evidence.', recommendation: 'Practice comparing claims with and without data.'
  },
  {
    code: 'BING-03', subjectId: 'BING', topicId: 'bing-1', subTopic: 'Vocabulary in context',
    cognitive: 'C4', difficulty: 'sedang', type: 'single',
    stimulus: 'Text: "The new recycling program significantly reduced waste in our school. As a result, the amount of trash sent to landfill declined by 40%."',
    prompt: 'The word "declined" in the text most nearly means ...',
    options: ['Increased sharply', 'Stayed the same', 'Decreased', 'Was measured', 'Was banned'],
    answer: 'C',
    explanation: 'The phrase "as a result" links the recycling program to a lower amount of trash; therefore "declined" means decreased.',
    reasons: ['Opposite of the context clue.', 'Contradicts "reduced waste".', 'Correct: declined means went down.', '"Measured" does not fit the percentage change.', 'The trash was not banned; it was reduced.'],
    indicator: 'Inferring word meaning from context clues',
    competency: 'Vocabulary inference', misconception: 'Choosing a familiar meaning without checking surrounding clues.', recommendation: 'Practice using cause-effect signals to infer vocabulary.'
  },
  {
    code: 'BING-04', subjectId: 'BING', topicId: 'bing-2', subTopic: 'Events order',
    cognitive: 'C4', difficulty: 'sedang', type: 'single',
    stimulus: 'Recount: "Last Saturday, I woke up early and packed my bag. After arriving at the station, I realized I had forgotten my ticket. I called my brother, who brought it just before the train departed."',
    prompt: 'What happened immediately before the writer called his brother?',
    options: ['He woke up early.', 'He packed his bag.', 'He arrived at the station.', 'He realized he had forgotten his ticket.', 'The train departed.'],
    answer: 'D',
    explanation: 'The sequence is woke up → packed → arrived → realized the ticket was missing → called brother → train departed. The realization directly triggered the call.',
    reasons: ['This happened much earlier.', 'This happened before arriving.', 'Arriving preceded the realization, but the call came after the realization.', 'Correct: the realization came right before the call.', 'The train departed after the call.'],
    indicator: 'Determining the sequence of events in a recount text',
    competency: 'Chronological comprehension', misconception: 'Choosing the first event mentioned instead of the immediately preceding event.', recommendation: 'Practice numbering events before answering sequence questions.'
  },
  {
    code: 'BING-05', subjectId: 'BING', topicId: 'bing-2', subTopic: 'Past tense',
    cognitive: 'C5', difficulty: 'sulit', type: 'single',
    stimulus: 'Recount draft: "Yesterday, we visit the museum and take many photos. Our teacher explains every collection before we go home."',
    prompt: 'Which revision uses the correct past tense consistently?',
    options: ['Yesterday, we visit the museum and took many photos.', 'Yesterday, we visited the museum and take many photos.', 'Yesterday, we visited the museum and took many photos. Our teacher explained every collection before we went home.', 'Yesterday, we visited the museum and take many photos. Our teacher explains every collection before we go home.', 'Yesterday, we are visiting the museum and taking many photos.'],
    answer: 'C',
    explanation: 'A recount describes completed events, so all verbs should be simple past: visited, took, explained, went.',
    reasons: ['"visit" remains present.', '"take" remains present.', 'Correct: all verbs are simple past.', 'Several verbs remain present.', 'Present continuous is not appropriate for a completed recount.'],
    indicator: 'Revising a recount for consistent simple past tense',
    competency: 'Grammar accuracy', misconception: 'Changing only the first verb and assuming the rest follow automatically.', recommendation: 'Practice underlining every verb in a recount before editing.'
  },
  {
    code: 'BING-06', subjectId: 'BING', topicId: 'bing-3', subTopic: 'Should vs must',
    cognitive: 'C5', difficulty: 'sedang', type: 'single',
    stimulus: 'Situation: The school rule says students must wear ID cards. A friend asks what to do before an exam tomorrow.',
    prompt: 'Which response uses modals correctly?',
    options: ['You must study tonight because it is a rule.', 'You should bring your ID card and you should study tonight.', 'You must bring your ID card and you should study tonight.', 'You should bring your ID card because it is optional.', 'You must studied tonight.'],
    answer: 'C',
    explanation: '"Must" expresses a rule/obligation (ID card), while "should" expresses advice (studying). The base form follows modals.',
    reasons: ['Studying is advice, not a school rule.', 'The ID card obligation is understated.', 'Correct: must for the rule, should for advice.', 'The ID card is required, not optional.', 'After "must", use the base form "study".'],
    indicator: 'Choosing modals that match obligation and advice in context',
    competency: 'Functional use of modals', misconception: 'Using "must" for every suggestion.', recommendation: 'Practice sorting situations into obligation, advice, and prohibition.'
  },
  {
    code: 'BING-07', subjectId: 'BING', topicId: 'bing-1', subTopic: 'Text structure',
    cognitive: 'C4', difficulty: 'sedang', type: 'multiple',
    stimulus: 'An analytical exposition text about school gardens contains several labeled parts.',
    prompt: 'Which parts belong to an analytical exposition text? (Choose all correct answers.)',
    options: ['Thesis', 'Orientation', 'Arguments', 'Reiteration', 'Events'],
    answer: ['A', 'C', 'D'],
    explanation: 'Analytical exposition typically has thesis, arguments, and reiteration. Orientation and events belong to recount texts.',
    reasons: ['Correct: states the position.', 'Incorrect: belongs to recount.', 'Correct: supports the position.', 'Correct: restates the position.', 'Incorrect: belongs to recount.'],
    indicator: 'Distinguishing analytical exposition structure from recount structure',
    competency: 'Genre differentiation', misconception: 'Transferring recount structure to exposition texts.', recommendation: 'Practice labeling parts of two contrasting texts side by side.'
  },
  {
    code: 'BING-08', subjectId: 'BING', topicId: 'bing-3', subTopic: 'Modals',
    cognitive: 'C5', difficulty: 'sulit', type: 'multiple',
    stimulus: 'Consider these rules and suggestions at a school laboratory.',
    prompt: 'Which sentences use modals appropriately? (Choose all correct answers.)',
    options: ['You must wear goggles in the lab.', 'You should ask the teacher before mixing chemicals.', 'You must to bring your own beaker.', 'You should ran quickly in the lab.', 'You must not eat in the lab.'],
    answer: ['A', 'B', 'E'],
    explanation: 'Modals are followed by the base form without "to". "Must not" expresses prohibition, which fits the lab rule.',
    reasons: ['Correct: obligation.', 'Correct: advice.', 'Incorrect: "must bring", not "must to bring".', 'Incorrect: "should run", not "should ran".', 'Correct: prohibition.'],
    indicator: 'Evaluating modal usage for rules, advice, and prohibition',
    competency: 'Modal accuracy', misconception: 'Adding "to" after modals or changing the verb to past form.', recommendation: 'Practice the rule modal + base verb in short sentences.'
  },
  {
    code: 'BING-09', subjectId: 'BING', topicId: 'bing-2', subTopic: 'Recount clues',
    cognitive: 'C4', difficulty: 'sedang', type: 'multiple',
    stimulus: 'A student is identifying clues in a recount paragraph.',
    prompt: 'Which clues typically signal a recount text? (Choose all correct answers.)',
    options: ['Past tense verbs', 'Time expressions such as "last week"', 'A thesis statement', 'A sequence of events', 'A recommendation for future action'],
    answer: ['A', 'B', 'D'],
    explanation: 'Recounts use past tense, time markers, and chronological events. Thesis and recommendation are typical of exposition.',
    reasons: ['Correct: recounts retell past events.', 'Correct: time markers orient the reader.', 'Incorrect: belongs to exposition.', 'Correct: events are arranged chronologically.', 'Incorrect: more typical of exposition or procedure.'],
    indicator: 'Identifying linguistic clues of recount texts',
    competency: 'Genre identification', misconception: 'Assuming any text with "should" is a recount.', recommendation: 'Practice sorting clues into recount, procedure, and exposition columns.'
  },
  {
    code: 'BING-10', subjectId: 'BING', topicId: 'bing-1', subTopic: 'Argument planning',
    cognitive: 'C6', difficulty: 'sulit', type: 'multiple',
    stimulus: 'A student will write an analytical exposition about banning single-use plastic in the canteen.',
    prompt: 'Which planning steps will produce a strong exposition? (Choose all correct answers.)',
    options: ['State a clear position in the thesis.', 'Collect data on waste produced each day.', 'Use only emotional words without evidence.', 'Give at least two arguments with reasons.', 'End by restating the position and suggesting an alternative.'],
    answer: ['A', 'B', 'D', 'E'],
    explanation: 'A strong exposition states a position, supports it with evidence and reasons, and closes with a reiteration. Emotional words alone are weak.',
    reasons: ['Correct: clarity of stance matters.', 'Correct: evidence strengthens arguments.', 'Incorrect: emotion without evidence is weak.', 'Correct: multiple reasons improve persuasiveness.', 'Correct: this is the reiteration step.'],
    indicator: 'Designing a writing plan for an argumentative text',
    competency: 'Text production planning', misconception: 'Believing persuasive writing only needs expressive language.', recommendation: 'Practice drafting thesis–arguments–reiteration outlines with evidence.'
  }
]
