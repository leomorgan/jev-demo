import type { Domain } from "@/lib/domain";

// Acme Energy: a fictional supplier. Stock HeroUI v3 theme.
export const energy = {
  id: "energy",
  name: "Acme Energy",
  path: "/energy",
  needInstructions: "What does this energy customer most need help with?",
  placeholder: "Tell us what you need, in your own words",
  care: {
    title: "You can talk to a person",
    text: "Call free on 0808 157 0192, 8am to 8pm, Monday to Saturday. No sales, no hold music.",
  },
  // The demo script: one message per front end, plus an ambiguous one and a distressed one.
  presets: [
    { label: "Lights out", q: "There's no power in my flat and the whole street has gone dark" },
    { label: "Bill doubled", q: "Why is my bill £80 more than last month?? Makes no sense" },
    { label: "Moving", q: "We're moving out on the 28th, what do I need to do?" },
    { label: "Shopping around", q: "How much would it cost to switch my 3-bed house over to you?" },
    { label: "Can't pay", q: "I lost my job and can't pay this month. I'm really scared you'll cut us off" },
    { label: "Vague", q: "I need to sort something out with my account" },
  ],
  needs: {
    outage: {
      label: "Power cut or no gas",
      hint: "Check for faults near you and what to do now",
      frontEnd: "outage",
      criteria: {
        covers: "No electricity or no gas right now: a power cut, supply off, meter not working",
        excludes: "Bills, prices or payments, even if the message mentions power",
        examples: ["the electricity just cut out", "gas has stopped coming through"],
      },
    },
    bill_shock: {
      label: "My bill went up",
      hint: "See what changed on your bill, and why",
      frontEnd: "bill",
      criteria: {
        covers: "Understanding or questioning a bill, a charge or a price that went up",
        excludes: "Not being able to afford to pay; that is payment_support",
        examples: ["this statement looks wrong", "why did my direct debit go up"],
      },
    },
    moving_home: {
      label: "Moving home",
      hint: "Tell us your moving date and send final readings",
      frontEnd: "move",
      criteria: {
        covers: "Moving house: closing an account, opening supply at a new address, final readings",
        examples: ["we're relocating next month", "I'm the new tenant at this address"],
      },
    },
    switching: {
      label: "Switching to us",
      hint: "Get a price for your home in under a minute",
      frontEnd: "quote",
      criteria: {
        covers: "Not yet a customer, or wants a cheaper tariff: prices, quotes, comparing plans",
        examples: ["can you beat my current supplier's price", "do you do green energy plans"],
      },
    },
    payment_support: {
      label: "Struggling to pay",
      hint: "Payment plans, breathing space and grants",
      frontEnd: "support",
      criteria: {
        covers: "Cannot afford to pay, debt, arrears, worried about being cut off, needs a payment plan",
        excludes: "Questioning why a bill is high without saying they cannot pay; that is bill_shock",
        examples: ["I'm struggling with my energy costs", "can I get help with arrears"],
      },
    },
    other: {
      label: "Something else",
      frontEnd: "general",
      criteria: {
        covers: "A clear request that fits none of the other options",
        examples: ["can I get paper bills", "do you have an app"],
      },
    },
    // Live, Jev's confidence sat at 1.00 on 17 of 18 answers, so "too vague to tell" is an
    // explicit option rather than something inferred from low confidence.
    unclear: {
      label: "Not clear yet",
      frontEnd: "clarify",
      criteria: {
        covers: "Asks for help but does not say with what, so no option above can be picked",
        examples: ["hi, I have a question", "something's not right, can you help?"],
      },
    },
  },
} satisfies Domain;
