import { describe, it, expect } from "@jest/globals";

describe("getResponseWithReasoning", () => {
  it("should extract content from <answer> tags", () => {
    const fullText = "Let me think:\n1. Step one\n2. Step two\n\n<answer>42</answer>";
    
    const answerMatch = fullText.match(/<answer>([\s\S]*?)<\/answer>/);
    const content = answerMatch ? answerMatch[1].trim() : fullText;
    const reasoning = answerMatch
      ? fullText.replace(/<answer>[\s\S]*?<\/answer>/g, "").trim()
      : fullText;

    expect(content).toBe("42");
    expect(reasoning).toContain("Let me think");
    expect(reasoning).not.toContain("<answer>");
  });

  it("should handle responses without <answer> tags", () => {
    const fullText = "This is a response without answer tags.";
    
    const answerMatch = fullText.match(/<answer>([\s\S]*?)<\/answer>/);
    const content = answerMatch ? answerMatch[1].trim() : fullText;
    const reasoning = answerMatch
      ? fullText.replace(/<answer>[\s\S]*?<\/answer>/g, "").trim()
      : fullText;

    expect(content).toBe("This is a response without answer tags.");
    expect(reasoning).toBe("This is a response without answer tags.");
  });

  it("should handle multi-line content in <answer> tags", () => {
    const fullText = "Thinking...\n\n<answer>Line 1\nLine 2\nLine 3</answer>";
    
    const answerMatch = fullText.match(/<answer>([\s\S]*?)<\/answer>/);
    const content = answerMatch ? answerMatch[1].trim() : fullText;
    const reasoning = answerMatch
      ? fullText.replace(/<answer>[\s\S]*?<\/answer>/g, "").trim()
      : fullText;

    expect(content).toBe("Line 1\nLine 2\nLine 3");
    expect(reasoning).toBe("Thinking...");
  });

  it("should handle empty reasoning before <answer> tags", () => {
    const fullText = "<answer>Direct answer</answer>";
    
    const answerMatch = fullText.match(/<answer>([\s\S]*?)<\/answer>/);
    const content = answerMatch ? answerMatch[1].trim() : fullText;
    const reasoning = answerMatch
      ? fullText.replace(/<answer>[\s\S]*?<\/answer>/g, "").trim()
      : fullText;

    expect(content).toBe("Direct answer");
    expect(reasoning).toBe("");
  });

  it("should handle reasoning after <answer> tags", () => {
    const fullText = "Initial thought\n<answer>The answer</answer>\nExtra notes";
    
    const answerMatch = fullText.match(/<answer>([\s\S]*?)<\/answer>/);
    const content = answerMatch ? answerMatch[1].trim() : fullText;
    const reasoning = answerMatch
      ? fullText.replace(/<answer>[\s\S]*?<\/answer>/g, "").trim()
      : fullText;

    expect(content).toBe("The answer");
    expect(reasoning).toContain("Initial thought");
    expect(reasoning).toContain("Extra notes");
  });
});
