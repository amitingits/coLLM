# coLLM: A Collaborative Workspace with Integrated Language Model Functionality

<p align="center">
<a href="#project-overview"><strong>Overview</strong></a> ·
<a href="#core-functionality"><strong>Functionality</strong></a> ·
<a href="#technical-architecture"><strong>Architecture</strong></a> ·
<a href="#setup-and-installation"><strong>Installation</strong></a> ·
<a href="#contribution-guidelines"><strong>Contributing</strong></a>
</p>

---

## Project Overview

**coLLM** is a collaborative software platform designed to integrate real-time, multi-user document editing with the capabilities of a Large Language Model (LLM). The application provides a unified workspace where users can engage in simultaneous content creation and interact with an intelligent assistant powered by the Google Gemini API.

This system is intended for teams engaged in tasks such as software documentation, academic writing, or creative brainstorming, offering a tool to enhance collaborative productivity and leverage artificial intelligence for content generation and analysis.

## Core Functionality

* **Real-time Collaboration:** Facilitates simultaneous document editing by multiple users, with all modifications synchronized instantly across all clients.
* **Integrated AI Assistant:** Enables direct interaction with the Gemini LLM for functions such as querying information, generating text, summarizing content, and assisting in brainstorming sessions.
* **Unified Workspace:** Provides a single, cohesive interface that combines the collaborative document editor with the AI chat functionality, allowing for a seamless workflow.
* **Secure and Scalable Backend:** Utilizes Supabase for robust user authentication, database management, and real-time data synchronization.
* **Performant Frontend:** Features a responsive and efficient user interface developed with Next.js and TypeScript, ensuring a smooth user experience.

## Technical Architecture
The project is implemented using a modern, full-stack architecture composed of the following technologies:

| Component              | Technology                                       |
| ---------------------- | ------------------------------------------------ |
| **Frontend** | Next.js, React, TypeScript, Tailwind CSS         |
| **Backend & Database** | Supabase (PostgreSQL, Authentication, Realtime)  |
| **Primary Language** | TypeScript                                       |
| **AI Model API** | Google Gemini API                                |
| **Deployment** | Vercel                                           |

## Setup and Installation

To deploy a local instance of this application, please follow the subsequent steps.

### Prerequisites

Ensure that Node.js and the Node Package Manager (npm) are installed on the local machine.

* **npm**
    ```sh
    npm install npm@latest -g
    ```

### Installation Procedure

1.  **Obtain API Credentials:**
    * Register a project on [Supabase](https://supabase.com) to acquire a Project URL and an `anon` key.
    * Generate an API key for the Gemini API via the [Google AI Studio](https://aistudio.google.com/).

2.  **Clone the Repository:**
    ```sh
    git clone <repository-link>
    cd collm
    ```

3.  **Install Project Dependencies:**
    ```sh
    npm install
    ```

4.  **Configure Environment Variables:**
    Create a file named `.env.local` in the project's root directory and populate it with the acquired credentials:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY
    ```

5.  **Execute the Development Server:**
    ```sh
    npm run dev
    ```

The application will be accessible at `http://localhost:3000` in a web browser.

## Contribution Guidelines

Contributions to the project are welcome. Suggestions for improvements can be made by forking the repository and submitting a pull request, or by opening a new issue with the "enhancement" tag.

The standard process for contributing is as follows:

1.  Fork the Project.
2.  Create a new branch for your feature (`git checkout -b feature/NewFeature`).
3.  Commit your changes with a descriptive message (`git commit -m 'Implement NewFeature'`).
4.  Push the branch to your fork (`git push origin feature/NewFeature`).
5.  Open a Pull Request for review.

## 📄 License

This project is distributed under the MIT License. Refer to the `LICENSE` file for additional information.

## 📧 Contact Information

Amit Uttam Das - [@amitingits](https://github.com/amitingits) - amituttamdas24@gmail.com

Project Repository: [https://github.com/your-username/collm](https://github.com/your-username/collm)
