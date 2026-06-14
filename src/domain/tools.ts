// Tool schemas exposed to the realtime model.
//
// The model uses these to:
//   1. Record what it learned about the customer (`record_intake`)
//   2. Inspect its own state if it gets confused (`get_intake`)
//   3. Get service recommendations based on the intake (`recommend_services`)
//   4. Find qualified stylists for a service (`recommend_stylists`)
//   5. Get open time slots (`check_availability`)
//   6. Confirm the booking (`book_appointment`)

export const tools = [
  {
    type: 'function' as const,
    name: 'record_intake',
    description:
      "Save what you've learned about the customer. Call this every time you gather new info (hair type, length, recent treatments, goal, etc.). Pass only the fields you just learned — earlier values are preserved.",
    parameters: {
      type: 'object',
      properties: {
        hairType: {
          type: 'string',
          enum: ['straight', 'wavy', 'curly', 'coily'],
        },
        hairLength: {
          type: 'string',
          enum: ['pixie', 'short', 'medium', 'long', 'extra-long'],
        },
        hairDensity: {
          type: 'string',
          enum: ['thin', 'medium', 'thick'],
        },
        scalpCondition: {
          type: 'string',
          enum: ['normal', 'dry', 'oily', 'sensitive'],
        },
        currentColor: {
          type: 'string',
          enum: ['natural', 'colored', 'highlighted', 'bleached'],
        },
        lastTreatmentDate: {
          type: 'string',
          description: 'ISO YYYY-MM-DD if known',
        },
        recentTreatments: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Lowercase tags: keratin, color, bleach, perm, relaxer, botox, treatment',
        },
        allergies: {
          type: 'array',
          items: { type: 'string' },
          description: 'Free-form, e.g. ammonia, PPD',
        },
        goal: {
          type: 'string',
          description: 'Customer goal in their own words',
        },
        styleReference: { type: 'string' },
        occasionDate: {
          type: 'string',
          description: 'ISO YYYY-MM-DD if the customer mentioned a wedding/event',
        },
        preferredStylistId: { type: 'string' },
        budgetRange: {
          type: 'string',
          enum: ['low', 'mid', 'premium'],
        },
        customerName: { type: 'string' },
        customerPhone: { type: 'string' },
      },
      required: [],
    },
  },
  {
    type: 'function' as const,
    name: 'get_intake',
    description:
      "Read the current intake state. Use this if you've lost track of what you've already collected. Returns the current intake and which core fields are still missing.",
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function' as const,
    name: 'recommend_services',
    description:
      "Get the top matching salon services for the current intake. Call this after you've gathered hair type, length, current color, recent treatments, and goal. Returns up to 4 services ranked by fit.",
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function' as const,
    name: 'recommend_stylists',
    description:
      'Get stylists qualified to perform a given service. Call after the customer picks a service.',
    parameters: {
      type: 'object',
      properties: {
        serviceId: { type: 'string', description: 'e.g. "svc-haircut"' },
      },
      required: ['serviceId'],
    },
  },
  {
    type: 'function' as const,
    name: 'check_availability',
    description:
      'Find open time slots. If stylistId is omitted, returns slots across all stylists qualified for the service (if serviceId provided). Salon is closed Sun + Mon. Days are scanned forward from fromDate.',
    parameters: {
      type: 'object',
      properties: {
        stylistId: {
          type: 'string',
          description: 'Optional — omit for "any stylist"',
        },
        serviceId: {
          type: 'string',
          description: 'Optional — used to filter to qualified stylists when stylistId is omitted',
        },
        fromDate: {
          type: 'string',
          description: 'ISO YYYY-MM-DD; defaults to today if omitted',
        },
        days: {
          type: 'integer',
          description: 'How many days forward to scan. Default 7.',
        },
      },
      required: [],
    },
  },
  {
    type: 'function' as const,
    name: 'book_appointment',
    description:
      'Commit the booking. Only call after the customer has explicitly confirmed all details (service, stylist, date, time, name, phone). date + time MUST be one of the slots returned by check_availability — never invent a date/time and never use a past date. Returns { ok: true, appointment } on success, or { ok: false, error } on failure; only tell the customer the booking succeeded when ok is true.',
    parameters: {
      type: 'object',
      properties: {
        serviceId: { type: 'string' },
        stylistId: { type: 'string' },
        date: { type: 'string', description: 'ISO YYYY-MM-DD' },
        time: { type: 'string', description: '24-hour HH:mm' },
        customerName: { type: 'string' },
        customerPhone: { type: 'string' },
        notes: { type: 'string', description: 'Optional free-text notes' },
      },
      required: ['serviceId', 'stylistId', 'date', 'time', 'customerName', 'customerPhone'],
    },
  },
];
