import type { Domain } from "@/lib/domain";

// Acme Bank: a fictional app bank with a Monzo-inspired look (coral, navy, rounded app cards).
// No real bank's name, logo or brand assets: this runs on a public portfolio URL.
export const bank = {
  id: "bank",
  name: "Acme Bank",
  path: "/bank",
  needInstructions: "What does this bank customer most need help with?",
  placeholder: "Search or ask, e.g. “I lost my card”",
  care: {
    title: "Our money help team is here",
    text: "Call free on 0808 157 0193, 8am to 8pm, every day. No judgement, and nothing you tell us affects your credit score.",
  },
  presets: [
    { label: "Card gone", q: "I can't find my card anywhere, I think it was nicked at the pub" },
    { label: "Scam call", q: "Someone rang saying they were from the bank and now £400 is missing" },
    { label: "Never arrived", q: "I paid for trainers a month ago and they never turned up" },
    { label: "Money tight", q: "I'm in my overdraft every month and it's really getting to me" },
    { label: "Saving up", q: "I want to save £2,000 for a wedding next summer" },
    { label: "Vague", q: "Hi, I need some help with my account" },
  ],
  needs: {
    lost_card: {
      label: "Lost or stolen card",
      hint: "Freeze it, report it, order a new one",
      frontEnd: "card",
      criteria: {
        covers: "The card itself is lost, stolen, damaged or hasn't arrived; wants to freeze or replace it",
        excludes: "Payments the person didn't make or was tricked into; that is fraud",
        examples: ["my wallet was stolen on holiday", "my dog chewed my card"],
      },
    },
    fraud: {
      label: "Scam or fraud",
      hint: "Stop payments you don't recognise",
      frontEnd: "fraud",
      criteria: {
        covers:
          "Payments they don't recognise or didn't make, being tricked into sending money, messages or calls pretending to be the bank",
        excludes: "A real purchase from a known shop that went wrong; that is dispute",
        examples: ["an email asked me to confirm my login details", "a stranger asked me to move money to a safe account"],
      },
    },
    dispute: {
      label: "Problem with a payment",
      hint: "Refunds, cancelled subscriptions, wrong charges",
      frontEnd: "dispute",
      criteria: {
        covers:
          "A purchase they made themselves that went wrong: not delivered, refund not received, charged the wrong amount or twice, a subscription that won't stop",
        excludes: "Payments they don't recognise at all; that is fraud",
        examples: ["the airline won't give me my refund", "the item arrived broken and the seller ignores me"],
      },
    },
    money_worries: {
      label: "Money worries",
      hint: "Breathing space, a plan and someone to talk to",
      frontEnd: "support",
      criteria: {
        covers: "Can't afford bills or repayments, stuck in an overdraft, debt, needs breathing space",
        excludes: "Wanting to save money; that is saving",
        examples: ["I'm behind on my loan repayments", "payday is a week away and I've got nothing left"],
      },
    },
    saving: {
      label: "Saving for something",
      hint: "Pots, goals and round-ups",
      frontEnd: "pots",
      criteria: {
        covers: "Wants to save, set a savings goal, put money aside or round up spare change",
        examples: ["help me put money aside for Christmas", "how do I build an emergency fund"],
      },
    },
    other: {
      label: "Something else",
      frontEnd: "general",
      criteria: {
        covers: "A clear request that fits none of the other options",
        examples: ["can I open a joint account", "what are your opening hours"],
      },
    },
    unclear: {
      label: "Not clear yet",
      frontEnd: "clarify",
      criteria: {
        covers: "Asks for help but does not say with what, so no option above can be picked",
        examples: ["question please", "I've got an issue with something"],
      },
    },
  },
} satisfies Domain;
