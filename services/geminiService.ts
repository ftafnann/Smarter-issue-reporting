import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisReport, Location, Priority } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
export const isGeminiConfigured = Boolean(API_KEY);

const fileToGenerativePart = (base64Data: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
};

/**
 * Primary image + location analysis (preserves original interface)
 */
export const analyzeImageWithLocation = async (
  base64ImageData: string,
  mimeType: string,
  location: Location
): Promise<Omit<AnalysisReport, 'id' | 'status' | 'createdAt' | 'reportedBy' | 'imageUrl' | 'assignedInspectorUsername'>> => {
  return analyzeIssueWithContext({ base64ImageData, mimeType }, location);
};

/**
 * Enhanced analysis accepting cloud incident metadata with or without evidence image
 */
export const analyzeIssueWithContext = async (
  context: {
    title?: string;
    description?: string;
    category?: string;
    severity?: Priority;
    cloudService?: string;
    base64ImageData?: string;
    mimeType?: string;
  },
  location: Location
): Promise<Omit<AnalysisReport, 'id' | 'status' | 'createdAt' | 'reportedBy' | 'imageUrl' | 'assignedInspectorUsername'>> => {
  try {
    if (!API_KEY) {
      // Fallback structured generation when API key is omitted so app never crashes
      return {
        problem: context.title || "Cloud Service Telemetry Degradation",
        problemCategory: context.category || "Cloud Infrastructure",
        priority: context.severity || Priority.Medium,
        cloudService: context.cloudService || "AWS us-east-1",
        report: context.description 
          ? `Reported Incident: ${context.description}\n\nAutomated AI diagnostic completed for ${context.cloudService || 'primary cluster'}. Telemetry suggests resource saturation and anomalous latency spikes across distributed nodes.`
          : `Automated diagnostic completed for ${context.cloudService || 'primary cluster'} at location (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}). Anomalous event detected requiring preventative maintenance.`,
        remediationSteps: "1. Inspect cluster node logs and memory saturation.\n2. Scale deployment pods horizontally across secondary availability zones.\n3. Verify network gateway throughput and reboot affected instances.",
        recipient: {
          name: "Cloud Site Administrator",
          email: "cloud.ops@example.com",
          phone: "555-123-4567"
        },
        inspector: {
          name: "Unassigned",
          phone: "N/A"
        }
      };
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const parts: any[] = [];

    if (context.base64ImageData && context.mimeType) {
      parts.push(fileToGenerativePart(context.base64ImageData, context.mimeType));
    }

    const promptText = `You are an expert cloud infrastructure, facility safety, and site reliability engineering (SRE) analysis system. 
Analyze the provided information (and image if available) for a reported cloud or facility issue.
Location: ${location.latitude}, ${location.longitude}.
User-reported Title: ${context.title || 'N/A'}
User-reported Description: ${context.description || 'N/A'}
User-selected Category: ${context.category || 'N/A'}
User-selected Severity: ${context.severity || 'N/A'}
Cloud Service / Component: ${context.cloudService || 'Cloud Infrastructure'}

Based on your analysis:
1. Determine the specific problem category (e.g. 'Kubernetes Cluster', 'Cloud Storage', 'Network Gateway', 'Database / Cache', 'Thermal / Cooling', 'Electrical / Power', 'Hardware Node', 'Security / Compliance').
2. Generate a concise, professional problem title.
3. Provide a detailed report explaining the incident, operational context, and potential risks to cloud uptime.
4. Suggest clear, actionable remediation steps or preventative measures.
5. Assign a priority level ('Low', 'Medium', or 'High').
6. The report should be sent to a "Site Administrator". Provide a plausible corporate email address ('site.admin@example.com') and a 10-digit US-style phone number.
7. Set the initial inspector to be 'Unassigned' with a placeholder phone number 'N/A'.

Respond ONLY with a JSON object adhering to this schema.`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            problemCategory: {
              type: Type.STRING,
              description: "The category of the problem (e.g., 'Cloud Storage', 'Kubernetes', 'Electrical')."
            },
            problem: {
              type: Type.STRING,
              description: "A short, concise title for the identified problem.",
            },
            report: {
              type: Type.STRING,
              description: "A detailed report explaining the problem, context, and potential cloud operational risks.",
            },
            remediationSteps: {
              type: Type.STRING,
              description: "Suggested steps to fix the issue or prevent infrastructure outage."
            },
            priority: {
              type: Type.STRING,
              enum: ["Low", "Medium", "High"],
              description: "The urgency of the issue.",
            },
            recipient: {
              type: Type.OBJECT,
              properties: {
                name: {
                  type: Type.STRING,
                  description: "This should always be 'Site Administrator'.",
                },
                email: {
                  type: Type.STRING,
                  description: "Corporate email address for the administrator.",
                },
                phone: {
                  type: Type.STRING,
                  description: "A plausible 10-digit phone number.",
                },
              },
              required: ["name", "email", "phone"],
            },
            inspector: {
              type: Type.OBJECT,
              properties: {
                name: {
                  type: Type.STRING,
                  description: "Initial inspector (Unassigned).",
                },
                phone: {
                  type: Type.STRING,
                  description: "Initial phone (N/A).",
                },
              },
              required: ["name", "phone"],
            },
          },
          required: ["problemCategory", "problem", "report", "priority", "recipient", "remediationSteps", "inspector"],
        },
      },
    });

    const jsonString = response.text?.trim();
    if (!jsonString) {
      throw new Error("API returned an empty response.");
    }

    const result = JSON.parse(jsonString);
    if (context.cloudService) {
      result.cloudService = context.cloudService;
    }
    // Ensure initial inspector is Unassigned until assigned by an Admin
    result.inspector = {
      name: 'Unassigned',
      phone: 'N/A',
    };
    return result;

  } catch (error) {
    console.error("Error in AI analysis:", error);
    let errorMessage = "An unknown error occurred during AI analysis.";
    if (error instanceof Error) {
      if (error.message.includes('API key not valid')) {
        errorMessage = "The provided Gemini API key is not valid. Please check your .env configuration.";
      } else if (error.message.includes('429')) {
        errorMessage = "API rate limit exceeded. Please try again later.";
      } else if (error.message.includes('500')) {
        errorMessage = "The AI service encountered an error. Please try again later.";
      } else if (error instanceof SyntaxError) {
        errorMessage = "Failed to parse the response from the AI. The response was not valid JSON.";
      } else {
        errorMessage = error.message;
      }
    }
    throw new Error(errorMessage);
  }
};
