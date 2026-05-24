import { Link, useNavigate } from "react-router-dom";

const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-gray-200">
            <h1 className="text-9xl font-extrabold tracking-widest text-red-500">404</h1>
            <h2 className="text-2xl md:text-3xl font-semibold mt-4">Oops! Page not found</h2>
            <p className="mt-2 text-gray-400 text-center max-w-md">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>

            <div className="mt-6 flex gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition"
                >
                    Go Back
                </button>
                <Link
                    to="/"
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                    Go to Homepage
                </Link>
            </div>
        </div>
    );
};

export default NotFoundPage;
