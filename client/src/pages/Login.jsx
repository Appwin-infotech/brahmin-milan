import React, { useState } from "react";
import LoginCarousel from "../components/carousel/LoginCarousel.jsx";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/constants.js";
import { meta } from "@eslint/js";

const Login = () => {
  return (
    <div className="w-full h-screen grid grid-cols-3">
      <LoginCarousel />
      <LoginForm />
    </div>
  );
};

export default Login;

const LoginForm = () => {
  const [formData, setFormData] = useState({ number: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotMobile, setForgotMobile] = useState("");
  const [forgotOTP, setForgotOTP] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error when user starts typing
    if (error) setError("");
  };

  const validateForm = () => {
    if (!formData.number.match(/^\d{10}$/)) {
      setError("Please enter a valid 10-digit mobile number");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear any existing errors

    if (!validateForm()) return;

    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/admin/adminLogin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mobileNo: formData.number,
            password: formData.password,
          }),
        }
      );

      const data = await response.json();

      if (data.status) {
        // Success case
        localStorage.setItem("authToken", data.data.token);
        localStorage.setItem("adminId", data.data._id);
        // Trigger event so SocketProvider knows to reinitialize
        window.dispatchEvent(new Event("admin-logged-in"));
        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("adminInfo", JSON.stringify(data.data));
        localStorage.setItem("message", data.message);
        navigate("/");
      } else {
        // API returned false status
        setError(data.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Something went wrong. Please try again.");
    }
  };

  const handleRequestOTP = async ({
    mobile,
    setError,
    setSuccess,
    setStep,
    BASE_URL,
  }) => {
    setError("");
    setSuccess("");
    if (!mobile.match(/^\d{10}$/)) {
      setError("Enter valid 10-digit mobile number");
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/api/v1/admin/requestAdminOTP`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNo: mobile }),
      });
      const data = await res.json();
      if (data.status) {
        setStep(2);
        setSuccess("OTP sent to your mobile number");
      } else {
        setError(data.message || "Failed to send OTP");
      }
    } catch (err) {
      setError("Network error. Try again.");
    }
  };

  const handleResetPassword = async ({
    mobile,
    otp,
    newPassword,
    setError,
    setSuccess,
    setModalOpen,
    setStep,
    resetFields,
    BASE_URL,
  }) => {
    setError("");
    setSuccess("");
    if (!otp.match(/^\d{6}$/)) {
      setError("Enter valid 6-digit OTP");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/api/v1/admin/resetAdminPassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNo: mobile, otp, newPassword }),
      });
      const data = await res.json();
      if (data.status) {
        setSuccess("Password reset! You can now login.");
        setTimeout(() => {
          setModalOpen(false);
          setStep(1);
          resetFields();
        }, 1500);
      } else {
        setError(data.message || "Failed to reset password");
      }
    } catch (err) {
      setError("Network error. Try again.");
    }
  };

  return (
    <div className="h-full w-full col-span-1 flex flex-col justify-center items-start px-8 text-[#203d5d]">
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-2">Forgot Password</h2>
            {forgotError && <div className="text-red-500 mb-2">{forgotError}</div>}
            {forgotSuccess && <div className="text-green-600 mb-2">{forgotSuccess}</div>}

            {forgotStep === 1 && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleRequestOTP({
                    mobile: forgotMobile,
                    setError: setForgotError,
                    setSuccess: setForgotSuccess,
                    setStep: setForgotStep,
                    BASE_URL,
                  });
                }}
              >
                <label className="block mb-1">Mobile Number</label>
                <input
                  type="tel"
                  className="w-full border rounded p-2 mb-3"
                  value={forgotMobile}
                  onChange={e => setForgotMobile(e.target.value)}
                  placeholder="Enter your mobile number"
                  required
                />
                <button className="bg-blue-600 text-white px-4 py-2 rounded w-full" type="submit">
                  Send OTP
                </button>
              </form>
            )}

            {forgotStep === 2 && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleResetPassword({
                    mobile: forgotMobile,
                    otp: forgotOTP,
                    newPassword: forgotNewPassword,
                    setError: setForgotError,
                    setSuccess: setForgotSuccess,
                    setModalOpen: setShowForgotModal,
                    setStep: setForgotStep,
                    resetFields: () => {
                      setForgotMobile("");
                      setForgotOTP("");
                      setForgotNewPassword("");
                      setForgotSuccess("");
                      setForgotError("");
                    },
                    BASE_URL,
                  });
                }}
              >
                <label className="block mb-1">OTP</label>
                <input
                  type="text"
                  className="w-full border rounded p-2 mb-2"
                  value={forgotOTP}
                  onChange={e => setForgotOTP(e.target.value)}
                  placeholder="Enter OTP"
                  required
                />
                <label className="block mb-1">New Password</label>
                <input
                  type="password"
                  className="w-full border rounded p-2 mb-2"
                  value={forgotNewPassword}
                  onChange={e => setForgotNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
                <button className="bg-blue-600 text-white px-4 py-2 rounded w-full" type="submit">
                  Reset Password
                </button>
              </form>
            )}

            <button
              className="mt-4 text-sm text-gray-600 underline"
              onClick={() => {
                setShowForgotModal(false);
                setForgotStep(1);
                setForgotMobile("");
                setForgotOTP("");
                setForgotNewPassword("");
                setForgotSuccess("");
                setForgotError("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <form className="space-y-6 w-full max-w-sm" onSubmit={handleSubmit}>
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        {/* Mobile Number Field */}
        <div>
          <label htmlFor="number" className="block text-sm font-medium">
            Mobile Number
          </label>
          <input
            type="tel"
            id="number"
            name="number"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Enter your mobile number"
            required
            value={formData.number}
            onChange={handleChange}
          />
        </div>

        {/* Password Field with Show/Hide Icon */}
        <div className="relative">
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <span
              className="absolute top-1/2 -translate-y-1/2 text-xl right-3 flex items-center cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <AiOutlineEye /> : <AiOutlineEyeInvisible />}
            </span>
          </div>
          <a
            href="#"
            className="text-right w-full inline-block text-sm mt-1"
            onClick={e => { e.preventDefault(); setShowForgotModal(true); }}
          >
            Forgot Password?
          </a>
        </div>

        {/* Login Button */}
        <div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#203d5d] hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Login
          </button>
        </div>
      </form>
    </div>


  );
};