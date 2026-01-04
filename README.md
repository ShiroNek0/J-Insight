# J-INSIGHT

An unified platform for monitoring Japan's public statistics and trends.

Currently featuring: **Immigration Services Statistics**.

## 🚀 Features

- **Interactive Charts**: Visualizations for Year-over-Year trends, Processing Wait Times, Approval Rates, and more.
- **Bureau Deaggregation**: Intelligent handling of aggregate data to separate branch office statistics from main bureaus.
- **Queue Prediction**: Estimation model to predict application queue positions and expected processing dates.
- **Responsive Design**: Fully responsive UI built with Tailwind CSS.
- **Internationalization**: Multi-language support (English, Japanese, Vietnamese).

## 🛠️ Tech Stack

### Frontend

- **Framework**: [Nuxt 4](https://nuxt.com/) (Vue 3)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Charts**: [Chart.js](https://www.chartjs.org/) with `vue-chartjs`
- **State Management**: Nuxt State / Composables

### Backend

- **Framework**: [NestJS](https://nestjs.com/)
- **API**: RESTful API
- **Runtime**: Node.js

## 📦 Prerequisites

- Node.js (v18 or later recommended)
- npm

## 🔧 Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/ShiroNek0/J-Insight.git
    cd J-Insight
    ```

2.  Install dependencies for both frontend and backend:
    ```bash
    npm run install:all
    ```
    _Alternatively, you can install dependencies manually in each folder:_
    ```bash
    npm install
    cd backend && npm install
    cd ../frontend && npm install
    ```

## 🏃‍♂️ Running the Project

Start both the backend and frontend servers concurrently:

```bash
npm run dev
```

- **Frontend**: http://localhost:3000 (or the port shown in terminal)
- **Backend**: http://localhost:3001

## 📂 Project Structure

- `frontend/`: Nuxt 4 application source code.
- `backend/`: NestJS API source code.
- `data/`: Raw data or static assets (if applicable).

## 💡 Acknowledgements

This project is heavily inspired by [JP Immigration Dashboard](https://github.com/RetroHazard/JP_Immigration_Dashboard). Special thanks to the original author, [RetroHazard](https://github.com/RetroHazard), for the concept and data insights.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
