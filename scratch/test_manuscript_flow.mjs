// scratch/test_manuscript_flow.mjs
import { uploadManuscriptVersion, getManuscriptVersions } from '../server/src/controllers/manuscriptController.js';
import { getRepositoryPublications } from '../server/src/controllers/repositoryController.js';

// Mock request / response helpers
const createMockRes = () => {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };
  return res;
};

async function runTests() {
  console.log("==================================================");
  console.log("TEST 1: Submit / Import a Manuscript");
  console.log("==================================================");

  const mockUser = {
    uid: 'student-test-101',
    fullName: 'David Tan',
    email: 'david.tan@university.edu',
    role: 'student'
  };

  const reqSubmit = {
    user: mockUser,
    body: {
      projectId: 'proj-test-101',
      title: 'Autonomous Drone Navigation Using Computer Vision & Edge AI',
      authors: 'David Tan, Samantha Cruz',
      department: 'Computer Science',
      adviserName: 'Dr. Eleanor Vance',
      abstract: 'This thesis implements an onboard stereo-vision localization pipeline running on an NVIDIA Jetson Orin Nano, enabling GPS-denied indoor quadcopter trajectory tracking.',
      keywords: 'Computer Vision, Drones, Edge AI, Robotics',
      versionTag: 'v1.0',
      fileName: 'Autonomous_Drone_Navigation_v1.0.pdf',
      fileSize: 4500000,
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      notes: 'Initial milestone submission for thesis repository.',
      publishToRepository: true
    }
  };

  const resSubmit = createMockRes();
  await uploadManuscriptVersion(reqSubmit, resSubmit);

  console.log("Submit Response Code:", resSubmit.statusCode);
  console.log("Submit Response Success:", resSubmit.data?.success);
  console.log("Manuscript ID:", resSubmit.data?.data?.id);
  console.log("Repository Publication ID:", resSubmit.data?.publication?.id);

  if (resSubmit.statusCode !== 201 || !resSubmit.data?.publication) {
    throw new Error("Failed to submit manuscript or auto-publish to repository");
  }

  console.log("\n==================================================");
  console.log("TEST 2: Check Manuscript Version History");
  console.log("==================================================");

  const reqVersions = {
    params: { projectId: 'proj-test-101' }
  };
  const resVersions = createMockRes();
  await getManuscriptVersions(reqVersions, resVersions);

  console.log("Versions count for project:", resVersions.data?.count);
  console.log("Latest version:", resVersions.data?.data?.[0]?.versionNumber);
  console.log("Latest file name:", resVersions.data?.data?.[0]?.fileName);

  if (!resVersions.data?.data?.some(v => v.title === reqSubmit.body.title)) {
    throw new Error("Submitted manuscript version not found in version history");
  }

  console.log("\n==================================================");
  console.log("TEST 3: Check Public Repository for Submitted Manuscript");
  console.log("==================================================");

  const reqRepo = {
    query: { search: 'Autonomous Drone Navigation', department: 'all' }
  };
  const resRepo = createMockRes();
  await getRepositoryPublications(reqRepo, resRepo);

  console.log("Repository search results count:", resRepo.data?.count);
  const found = resRepo.data?.data?.find(p => p.title.includes('Autonomous Drone Navigation'));

  console.log("Found in Repository:", Boolean(found));
  if (found) {
    console.log("  - Title:", found.title);
    console.log("  - Authors:", found.authors);
    console.log("  - Department:", found.department);
    console.log("  - Citation:", found.citation);
    console.log("  - PDF URL:", found.pdfUrl);
  } else {
    throw new Error("Manuscript was not found publicly in repository publications!");
  }

  console.log("\n==================================================");
  console.log("ALL TESTS PASSED SUCCESSFULLY! ✅");
  console.log("==================================================");
}

runTests().catch(err => {
  console.error("Test Error:", err);
  process.exit(1);
});
