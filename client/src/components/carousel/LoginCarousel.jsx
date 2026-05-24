import React, { useEffect } from "react";
import Carousel from "./Carousel";

const LoginCarousel = () => {
  const testimage =
    "https://images.unsplash.com/photo-1513267000941-598abe7be16f?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
  const testimage2 =
    "https://images.unsplash.com/photo-1519671298057-aba40b21089b?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
  const testimage3 =
    "https://images.unsplash.com/photo-1529634597503-139d3726fed5?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
  const slides = [
    {
      image: testimage,
      name: "Matchmaking",
      text: "Find your perfect match based on preferences, compatibility, and shared values.",
    },
    {
      image: testimage2,
      name: "Profile Management",
      text: "Create, update, and manage your profile to attract the right connections.",
    },
    {
      image: testimage3,
      name: "Compatibility Assessment",
      text: "Assess compatibility with potential matches using advanced algorithms and questionnaires.",
    },
  ].map((data) => {
    return (
      <div className="h-screen w-full relative">
        <img
          src={data.image}
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute px-8 py-24 top-0 left-0 h-full w-full flex flex-col justify-end items-start text-white bg-black/50 gap-4">
          <h2 className="text-2xl font-bold">{data.name}</h2>
          <h2 className="max-w-xs">{data.text}</h2>
        </div>
      </div>
    );
  });

  useEffect(() => {}, []);

  return (
    <div className="w-full overflow-hidden flex flex-col justify-evenly items-center col-span-2">
      <div className="h-screen w-full loginpage relative">
        <Carousel data={slides} setnum={1} setmode="fadeout" />
      </div>
    </div>
  );
};

export default LoginCarousel;
