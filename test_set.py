# Pitwall RAGAS test set
# Each entry: question, ground_truth answer, question_type
# ground_truth is the correct answer for RAGAS to measure against

TEST_SET = [
    # ── Single-driver factual ──────────────────────────────────────────
    {
        "question": "What was Hamilton's finishing position in the 2024 Bahrain Grand Prix?",
        "ground_truth": "Hamilton finished the 2024 Bahrain Grand Prix in P7.",
        "type": "factual"
    },
    {
        "question": "How many points did Leclerc score in the 2024 Australian Grand Prix?",
        "ground_truth": "Leclerc scored 18 points in the 2024 Australian Grand Prix, finishing in P2.",
        "type": "factual"
    },
    {
        "question": "What grid position did Verstappen start from in the 2023 Belgian Grand Prix?",
        "ground_truth": "Verstappen started the 2023 Belgian Grand Prix from P6 on the grid.",
        "type": "factual"
    },
    {
        "question": "What was Norris's finishing position in the 2024 Singapore Grand Prix?",
        "ground_truth": "Norris won the 2024 Singapore Grand Prix, finishing in P1.",
        "type": "factual"
    },
    {
        "question": "How many pit stops did Verstappen make in the 2023 Belgian Grand Prix?",
        "ground_truth": "Verstappen made 2 pit stops in the 2023 Belgian Grand Prix.",
        "type": "factual"
    },
    {
        "question": "What was Piastri's finishing position in the 2024 Hungarian Grand Prix?",
        "ground_truth": "Piastri finished the 2024 Hungarian Grand Prix in P1.",
        "type": "factual"
    },

    # ── Race winner / podium ───────────────────────────────────────────
    {
        "question": "Who won the 2023 Monaco Grand Prix?",
        "ground_truth": "Verstappen won the 2023 Monaco Grand Prix. Alonso finished P2 and Ocon finished P3.",
        "type": "race_result"
    },
    {
    "question": "Who won the 2024 British Grand Prix?",
    "ground_truth": "Hamilton won the 2024 British Grand Prix. Verstappen finished P2 and Norris finished P3.",
    "type": "race_result"
    },
    {
        "question": "Who won the 2025 Australian Grand Prix?",
        "ground_truth": "Norris won the 2025 Australian Grand Prix. Verstappen finished P2 and Russell finished P3.",
        "type": "race_result"
    },
    {
        "question": "Who was on the podium at the 2024 Singapore Grand Prix?",
        "ground_truth": "Norris won the 2024 Singapore Grand Prix. Verstappen finished P2 and Piastri finished P3.",
        "type": "race_result"
    },
    {
        "question": "Who won the 2023 Dutch Grand Prix?",
        "ground_truth": "Verstappen won the 2023 Dutch Grand Prix.",
        "type": "race_result"
    },
    {
        "question": "Who won the 2025 Australian Grand Prix?",
        "ground_truth": "Norris won the 2025 Australian Grand Prix.",
        "type": "race_result"
    },

    # ── Strategy comparison ────────────────────────────────────────────
    {
        "question": "How did Verstappen's tire strategy differ from Norris in the 2023 Belgian Grand Prix?",
        "ground_truth": "Verstappen used a SOFT-MEDIUM-SOFT strategy while Norris used a MEDIUM-HARD-SOFT strategy in the 2023 Belgian Grand Prix.",
        "type": "comparison"
    },
    {
        "question": "How did Hamilton's race strategy compare to Russell in the 2024 British Grand Prix?",
        "ground_truth": "Hamilton and Russell both raced for Mercedes in the 2024 British Grand Prix. Hamilton finished P1 and Russell finished P2.",
        "type": "comparison"
    },
    {
        "question": "How did Leclerc's finishing position compare to Sainz in the 2024 Australian Grand Prix?",
        "ground_truth": "Leclerc finished P2 and Sainz finished P3 in the 2024 Australian Grand Prix.",
        "type": "comparison"
    },
    {
        "question": "How did Verstappen's points compare to Norris after the 2024 Singapore Grand Prix?",
        "ground_truth": "Norris won the 2024 Singapore Grand Prix scoring 25 points. Verstappen finished P2 scoring 18 points.",
        "type": "comparison"
    },
    {
        "question": "How did Piastri's tire strategy differ from Norris in the 2024 Hungarian Grand Prix?",
        "ground_truth": "Piastri won the 2024 Hungarian Grand Prix. Both drivers raced for McLaren.",
        "type": "comparison"
    },
    {
        "question": "How did Alonso's finishing position compare to Hamilton in the 2023 Monaco Grand Prix?",
        "ground_truth": "Alonso finished P2 and Hamilton finished behind the podium in the 2023 Monaco Grand Prix.",
        "type": "comparison"
    },

    # ── Tire / pit stop specific ───────────────────────────────────────
    {
        "question": "What tire compound did Verstappen start on in the 2023 Belgian Grand Prix?",
        "ground_truth": "Verstappen started the 2023 Belgian Grand Prix on SOFT tires.",
        "type": "strategy"
    },
    {
        "question": "How many pit stops did Leclerc make in the 2024 Australian Grand Prix?",
        "ground_truth": "Leclerc made 2 pit stops in the 2024 Australian Grand Prix.",
        "type": "strategy"
    },
    {
        "question": "What was Verstappen's tire strategy in the 2024 Bahrain Grand Prix?",
        "ground_truth": "Verstappen's tire strategy in the 2024 Bahrain Grand Prix included multiple stints.",
        "type": "strategy"
    },
    {
        "question": "On what lap did Hamilton pit in the 2024 Belgian Grand Prix?",
        "ground_truth": "Hamilton pitted on lap 11 of the 2024 Belgian Grand Prix, changing from MEDIUM to HARD tires.",
        "type": "strategy"
    },
    {
        "question": "What tires did Norris finish the 2024 Singapore Grand Prix on?",
        "ground_truth": "Norris ran multiple stints in the 2024 Singapore Grand Prix.",
        "type": "strategy"
    },

    # ── Weather / race conditions ──────────────────────────────────────
    {
        "question": "What were the weather conditions at the 2024 Singapore Grand Prix?",
        "ground_truth": "The 2024 Singapore Grand Prix was held in dry conditions with an average track temperature of 36.4 degrees Celsius.",
        "type": "weather"
    },
    {
        "question": "Did it rain during the 2023 Monaco Grand Prix?",
        "ground_truth": "Yes, the 2023 Monaco Grand Prix was held in wet conditions.",
        "type": "weather"
    },
    {
        "question": "What were the weather conditions at the 2024 Bahrain Grand Prix?",
        "ground_truth": "The 2024 Bahrain Grand Prix was held in dry conditions.",
        "type": "weather"
    },
    {
        "question": "Was the 2023 Austrian Grand Prix held in wet or dry conditions?",
        "ground_truth": "The 2023 Austrian Grand Prix was held in wet conditions.",
        "type": "weather"
    },

    # ── Out-of-scope / unanswerable ────────────────────────────────────
    {
        "question": "What is the top speed of a 2024 F1 car?",
        "ground_truth": "This question cannot be answered from the available race data.",
        "type": "out_of_scope"
    },
    {
        "question": "Who will win the 2026 F1 World Championship?",
        "ground_truth": "This question cannot be answered from the available race data.",
        "type": "out_of_scope"
    },
    {
        "question": "What is Lewis Hamilton's contract salary at Ferrari?",
        "ground_truth": "This question cannot be answered from the available race data.",
        "type": "out_of_scope"
    },
    {
        "question": "What was the fastest lap time ever recorded in F1 history?",
        "ground_truth": "This question cannot be answered from the available race data.",
        "type": "out_of_scope"
    },
]