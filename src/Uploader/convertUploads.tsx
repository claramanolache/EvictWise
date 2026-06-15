import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store'; // Assuming your store exports RootState
import { FileData } from '../slice';

// This is a placeholder for the actual calendar population logic
const populateCalendar = (dates: Date[]) => {
  console.log("Populating calendar with dates:", dates);
  // This function will be fully implemented in app/Calendar.tsx
};

// --- AI Simulation ---
// This is a mock AI function. In a real app, you would make an API call to your AI service.
const mockAIProcessor = async (evictionMarkdown: string, leaseMarkdown: string) => {
  console.log("AI is processing documents...");

  // 1. Simulate finding important dates from the eviction notice
  // In a real scenario, the AI would parse the text to find dates.
  const importantDates: Date[] = [
    new Date(), // Placeholder for "Notice Date"
    new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000), // Placeholder for "Move-out Date"
  ];

  // 2. Simulate explaining the lease agreement
  const leaseExplanation = {
    summary: "This is a standard lease agreement outlining the terms of your tenancy.",
    legalTerms: [
      { term: "Rent Clause", significance: "Specifies the amount of rent, due date, and penalties for late payment." },
      { term: "Security Deposit", significance: "Details the amount and conditions for the return of your security deposit." },
      { term: "Termination Clause", significance: "Explains the conditions under which the lease can be terminated by either party." },
    ]
  };

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  return { importantDates, leaseExplanation };
};


const ConvertUploads = () => {
  const { evictionNotice, leaseAgreement } = useSelector((state: RootState) => state.app);
  const [processing, setProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  useEffect(() => {
    const processFiles = async () => {
      if (evictionNotice && leaseAgreement && !processing && !aiResult) {
        setProcessing(true);

        // Step 1: Convert files to Markdown (simulation)
        // In a real app, you might fetch the file content from the URI and convert it.
        const evictionMarkdown = `## Eviction Notice\n\nName: ${evictionNotice.name}\nSize: ${evictionNotice.size} bytes`;
        const leaseMarkdown = `## Lease Agreement\n\nName: ${leaseAgreement.name}\nSize: ${leaseAgreement.size} bytes`;

        // Step 2: Pass to AI
        const result = await mockAIProcessor(evictionMarkdown, leaseMarkdown);
        setAiResult(result);

        // Step 3: Pass dates to populateCalendar
        if (result.importantDates) {
          populateCalendar(result.importantDates);
        }

        setProcessing(false);
      }
    };

    processFiles();
  }, [evictionNotice, leaseAgreement, processing, aiResult]);

  return (
    <div>
      <h1>Document Processing</h1>
      {processing && <p>Processing documents, please wait...</p>}
      {aiResult && (
        <div>
          <h2>AI Analysis Complete</h2>
          <h3>Important Dates from Eviction Notice:</h3>
          <ul>
            {aiResult.importantDates.map((date: Date, index: number) => (
              <li key={index}>{date.toDateString()}</li>
            ))}
          </ul>
          <h3>Lease Agreement Explanation:</h3>
          <p>{aiResult.leaseExplanation.summary}</p>
          <h4>Key Legal Terms:</h4>
          <ul>
            {aiResult.leaseExplanation.legalTerms.map((term: any, index: number) => (
              <li key={index}>
                <strong>{term.term}:</strong> {term.significance}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!evictionNotice && !leaseAgreement && <p>Please upload your documents first.</p>}
    </div>
  );
};

export default ConvertUploads;
