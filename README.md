# 🛍️ Stashify — Full-Stack E-Commerce Marketplace

A modern, full-stack e-commerce marketplace built with React, Node.js, Express and MongoDB. Stashify provides a complete shopping experience with product discovery, user authentication, shopping carts, order management, seller tools and integrated payment checkout.

<p align="center">

**[🌐 Visit Live Website](https://stashify-ecommerce.vercel.app)**

</p>

---

## 📸 Project Preview

<!-- Add your actual GitHub-hosted screenshots here -->

| Storefront | Product Listing |
|---|---|
| Add homepage screenshot | Add shop screenshot |

| Checkout | Seller Dashboard |
|---|---|
| Add checkout screenshot | Add seller dashboard screenshot |

---

## 📌 Project Overview

Stashify is a full-stack e-commerce marketplace developed to demonstrate the integration of modern frontend and backend technologies.

The application allows customers to browse products, manage their shopping carts, save delivery addresses, complete checkout and track their orders. It also provides seller and administrative functionality for managing products and orders.

The project focuses on combining a clean user interface with practical backend functionality, database integration and payment processing.

## ✨ Key Features

### 🛒 Customer Experience
- Modern, responsive e-commerce storefront.
- Product browsing and category filtering.
- Product search and sorting.
- Product details and image galleries.
- Shopping cart and wishlist.
- Coupon and discount functionality.
- Delivery address management.
- Order history and order tracking.

### 🔐 Authentication & Accounts
- User registration and login.
- Clerk authentication integration.
- Email and mobile verification.
- User profile management.
- Secure account sessions.

### 💳 Checkout & Payments
- Multi-step checkout process.
- Razorpay payment gateway integration.
- Server-side order creation.
- Payment signature verification.
- Payment testing using Razorpay Test Mode.

**Note:** The deployed Razorpay integration uses Test Mode credentials. Payments are for demonstration and testing only; no real transactions are processed.

### 📦 Order Management
- Order confirmation.
- Order history.
- Order tracking.
- Delivery verification.
- Administrative order management.

### 🏪 Seller Dashboard
- Seller onboarding.
- Product creation and editing.
- Product image uploads.
- Inventory and product management.
- Seller order management.
- Store performance overview.

## 🧰 Technologies Used

| Category | Technology |
|---|---|
| Frontend | React.js |
| Backend | Node.js |
| API Framework | Express.js |
| Database | MongoDB Atlas |
| Authentication | Clerk |
| Image Storage | Cloudinary |
| Payments | Razorpay |
| Deployment | Vercel |
| Version Control | Git & GitHub |

## 🗄️ Database & Integrations

Stashify uses MongoDB Atlas to store application data, including user accounts, products, orders and related information.

Other integrations include:

- **Clerk:** Authentication and user identity.
- **Cloudinary:** Product image storage and delivery.
- **Razorpay:** Payment checkout integration in Test Mode.
- **Vercel:** Hosting and deployment.

## 🏗️ Project Structure

```text
stashify/
│
├── client/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── lib/
│       └── styles.css
│
├── server/
│   ├── index.js
│   └── ...
│
├── public/
├── package.json
└── README.md
```

## ⚙️ Running the Project Locally

### 1. Clone the repository

```bash
git clone https://github.com/hammadkazi16/stashify-ecommerce.git
```

### 2. Navigate to the project

```bash
cd stashify-ecommerce
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a local `.env` file using the environment variables required by the application.

These include the relevant configuration for:

- MongoDB connection.
- Clerk authentication.
- Cloudinary.
- JWT configuration.
- Administrator account.
- Razorpay API credentials.

**Important:** Never upload `.env` files, API secrets, database passwords or private credentials to GitHub.

### 5. Build the application

```bash
npm run build
```

### 6. Start the application

```bash
npm start
```

The local application is served through the configured Express server.

## 🔒 Security & Important Notes

- Sensitive configuration is managed through environment variables.
- Payment verification is handled on the server.
- Payment amounts are calculated and validated server-side.
- User authentication is integrated through Clerk.
- Database access is managed through MongoDB Atlas.
- Razorpay credentials must remain private.

Stashify is an educational portfolio project. The deployed payment integration uses Razorpay Test Mode and should not be represented as a live commercial payment service.

## 🎯 Project Objectives

This project demonstrates practical knowledge of:

- Full-stack web application development.
- Frontend and backend integration.
- REST API development.
- Database design and integration.
- User authentication.
- Third-party service integration.
- Payment gateway workflows.
- Deployment and version control.

## 🚀 Future Improvements

- Enhanced product recommendation functionality.
- Advanced analytics for sellers.
- Improved inventory management.
- Additional payment and delivery integrations.
- Further performance and security enhancements.

## 👨‍💻 Developer

**Developed as a full-stack e-commerce portfolio project.**

GitHub: [@hammadkazi16](https://github.com/hammadkazi16)

Project Repository: [Stashify E-Commerce](https://github.com/hammadkazi16/stashify-ecommerce)

Live Website: [stashify-ecommerce.vercel.app](https://stashify-ecommerce.vercel.app)

---

<p align="center">

**Stashify — Discover. Shop. Experience.**

</p>
