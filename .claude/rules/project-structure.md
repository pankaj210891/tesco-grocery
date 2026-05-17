# Project Structure Rules

src/
│
├── app/
├── components/
│ ├── common/
│ ├── forms/
│ ├── layout/
│ └── ui/
│
├── modules/
│ ├── auth/
│ ├── products/
│ ├── cart/
│ ├── checkout/
│ └── orders/
│
├── hooks/
├── services/
├── store/
├── models/
├── validations/
├── lib/
├── utils/
├── types/
└── constants/

Rules:

- Keep components under 300 lines
- Separate business logic from UI
- Keep API calls in services/
- Keep schemas in validations/
