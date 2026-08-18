// // frontend/src/app/page.tsx
// 'use client';

// import RoutineOrchestrator from '../src/components/RoutineOrchestrator';

// export default function Home() {
//   return (
//     <main className="min-h-screen p-8 bg-gray-50">
//       <div className="max-w-7xl mx-auto">
//         <h1 className="text-3xl font-bold text-gray-900 mb-8">
//           Class Routine
//         </h1>
//         <RoutineOrchestrator />
//       </div>
//     </main>
//   );
// }
// frontend/app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/auth/signin');
}
