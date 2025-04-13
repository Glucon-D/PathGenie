// /pages/CareerSummary.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { RiArrowRightLine, RiDownloadLine, RiUserStarLine, RiCheckboxCircleFill } from 'react-icons/ri';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { account } from "../config/appwrite";
import { databases } from "../config/database";
import { generateCareerSummary } from "../config/gemini";
import { Query } from 'appwrite';
import { toast } from 'react-hot-toast';
import html2pdf from 'html2pdf.js';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const USERS_COLLECTION_ID = import.meta.env.VITE_USERS_COLLECTION_ID;
const CAREER_PATHS_COLLECTION_ID = import.meta.env.VITE_CAREER_PATHS_COLLECTION_ID;
const ASSESSMENTS_COLLECTION_ID = import.meta.env.VITE_ASSESSMENTS_COLLECTION_ID;

const normalizeCareerName = (name) => {
  return name?.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
};

const COLORS = ['#3b82f6', '#e5e7eb'];

const CareerSummary = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [careerSummaries, setCareerSummaries] = useState([]);
  const refs = useRef([]);

  useEffect(() => {
    fetchAllCareerSummaries();
  }, []);

  const fetchAllCareerSummaries = async () => {
    try {
      setLoading(true);
      const user = await account.get();

      const [userRes, pathsRes, assessmentsRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [Query.equal("userID", user.$id)]),
        databases.listDocuments(DATABASE_ID, CAREER_PATHS_COLLECTION_ID, [Query.equal("userID", user.$id)]),
        databases.listDocuments(DATABASE_ID, ASSESSMENTS_COLLECTION_ID, [Query.equal("userID", user.$id)])
      ]);

      const userDoc = userRes.documents[0];
      const assessments = assessmentsRes.documents.map((a) => ({
        moduleID: a.moduleID,
        moduleName: a.moduleName || `Module ${a.moduleID}`,
        score: a.score,
        feedback: a.feedback
      }));

      const parsedUser = {
        ...userDoc,
        interests: JSON.parse(userDoc.interests || "[]"),
        skills: JSON.parse(userDoc.skills || "[]")
      };

      const normalizedGoal = normalizeCareerName(userDoc.careerGoal);
      const nameMap = new Map();

      const paths = pathsRes.documents.map(path => ({
        ...path,
        modules: JSON.parse(path.modules || "[]"),
        completedModules: JSON.parse(path.completedModules || "[]"),
        recommendedSkills: JSON.parse(path.recommendedSkills || "[]"),
        aiNudges: JSON.parse(path.aiNudges || "[]")
      }));

      paths.forEach(path => {
        const name = normalizeCareerName(path.careerName);
        if (!name || name === normalizedGoal) return;

        if (!nameMap.has(name)) nameMap.set(name, path);
        else {
          const existing = nameMap.get(name);
          if ((path.modules?.length || 0) > (existing.modules?.length || 0) || path.progress > existing.progress) {
            nameMap.set(name, path);
          }
        }
      });

      const keptPaths = Array.from(nameMap.values());

      const allSummaries = await Promise.all(keptPaths.map(async (career, idx) => {
        const summary = await generateCareerSummary({
          user: parsedUser,
          careerPath: career,
          assessments
        });

        return {
          ref: React.createRef(),
          data: {
            name: parsedUser.name,
            goal: career.careerName,
            progress: career.progress,
            completed: career.completedModules.length,
            total: career.modules.length
          },
          summaryText: summary
        };
      }));

      refs.current = allSummaries.map((s) => s.ref);
      setCareerSummaries(allSummaries);
    } catch (err) {
      toast.error("Failed to load summaries");
      console.error("Error fetching summaries:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (ref, fileName) => {
    if (!ref.current) return toast.error("Nothing to download!");
    try {
      toast.loading("Preparing PDF...");
      await html2pdf().set({
        margin: 0.5,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      }).from(ref.current).save();
      toast.dismiss();
      toast.success("PDF downloaded!");
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to generate PDF");
    }
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-blue-600">Generating career summaries...</div>;
  }

  return (
    <div className="md:p-6 min-h-screen bg-gradient-to-br from-sky-100 to-blue-100 space-y-10">
      {careerSummaries.map((summary, index) => {
        const pieData = [
          { name: 'Completed', value: summary.data.completed },
          { name: 'Remaining', value: summary.data.total - summary.data.completed }
        ];

        return (
          <motion.div
            key={index}
            className="min-w-xs max-w-full mx-auto bg-white rounded-xl shadow-xl p-4 sm:p-5 md:p-6 lg:p-8 space-y-6"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[#1e40af] flex items-center gap-2">
                <RiUserStarLine /> Career Summary for {summary.data.goal}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-[#2563eb]">
                <span className="flex items-center gap-1"><RiCheckboxCircleFill /> Modules: {summary.data.completed}/{summary.data.total}</span>
                <span className="flex items-center gap-1">🚀 Progress: {summary.data.progress}%</span>
              </div>
            </div>

            {/* PDF Content */}
            <div
              ref={summary.ref}
              className="summary-container"            >
              <h2>Career Summary Report for {summary.data.name}</h2>
              <p><span className="bold-text">Career Goal:</span> {summary.data.goal}</p>
              <p><span className="bold-text">Modules Completed:</span> {summary.data.completed}/{summary.data.total}</p>
              <p><span className="bold-text">Overall Progress:</span> {summary.data.progress}%</p>
              <hr className="my-3" />
              <div className="flex flex-col items-center justify-center mt-6 mb-4">
                <div style={{ width: '200px', height: '200px' }}>
                  <PieChart width={200} height={200}>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={60} label>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </div>

                <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{ width: '15px', height: '15px', backgroundColor: COLORS[0], borderRadius: '3px' }}></div>
                    <span><strong>Completed Modules</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '15px', height: '15px', backgroundColor: COLORS[1], borderRadius: '3px' }}></div>
                    <span><strong>Remaining Modules</strong></span>
                  </div>
                </div>
              </div>



              <hr style={{ margin: "15px 0" }} />
              {summary.summaryText.split("\n\n").map((block, idx) => {
                const formatted = block
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")  // Bold from **text**
                  .replace(/\n/g, "<br/>");

                return (
                  <div key={idx} dangerouslySetInnerHTML={{ __html: formatted }} />
                );
                <br />
              })}
            </div>

            <div className="flex gap-4 pt-4 justify-center">
              <button
                className="px-5 py-2 bg-blue-100 text-blue-700 rounded-lg flex gap-2 items-center"
                onClick={() => handleDownload(summary.ref, `${summary.data.goal.replace(/\s/g, "_")}_Summary.pdf`)}
              >
                <RiDownloadLine /> Download PDF
              </button>
              <button
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg flex gap-2 items-center"
                onClick={() => navigate("/dashboard")}
              >
                Back to Dashboard <RiArrowRightLine />
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default CareerSummary;
