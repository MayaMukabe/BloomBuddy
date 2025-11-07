
async function testConversations() {
  console.log('=== Testing Conversation Retrieval ===');
  console.log('Current User ID:', window.currentUserId);
  console.log('Firestore DB:', window.db);
  
  if (!window.currentUserId) {
    console.error('No user ID found. User might not be authenticated.');
    return;
  }
  
  if (!window.db) {
    console.error('Firestore not initialized');
    return;
  }
  
  try {
    // Test 1: Check if conversations collection exists and is readable
    console.log('\n--- Test 1: Fetching all conversations ---');
    const conversationsRef = window.collection(window.db, 'conversations');
    const snapshot = await window.getDocs(conversationsRef);
    console.log(`Total conversations in database: ${snapshot.docs.length}`);
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`Conversation ${doc.id}:`, {
        userId: data.userId,
        topic: data.topic,
        startedAt: data.startedAt?.toDate(),
        matchesCurrentUser: data.userId === window.currentUserId
      });
    });
    
    // Test 2: Query with userId filter
    console.log('\n--- Test 2: Querying with userId filter ---');
    const userConversationsQuery = window.query(
      conversationsRef,
      window.where('userId', '==', window.currentUserId)
    );
    const userSnapshot = await window.getDocs(userConversationsQuery);
    console.log(`Conversations for current user: ${userSnapshot.docs.length}`);
    
    userSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- ${doc.id} (${data.topic})`, data.startedAt?.toDate());
    });
    
    // Test 3: Check messages subcollection
    if (userSnapshot.docs.length > 0) {
      console.log('\n--- Test 3: Checking messages for first conversation ---');
      const firstConv = userSnapshot.docs[0];
      const messagesRef = window.collection(window.db, 'conversations', firstConv.id, 'messages');
      const messagesSnapshot = await window.getDocs(messagesRef);
      console.log(`Messages in conversation ${firstConv.id}: ${messagesSnapshot.docs.length}`);
      
      messagesSnapshot.docs.forEach(doc => {
        const msg = doc.data();
        console.log(`- ${msg.role}: ${msg.content.substring(0, 50)}...`);
      });
    }
    
  } catch (error) {
    console.error('Error during testing:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'permission-denied') {
      console.error('\n⚠️ PERMISSION DENIED - Check Firestore security rules!');
      console.error('You need to allow users to read their own conversations.');
    }
  }
}

// Make it available globally
window.testConversations = testConversations;
console.log('Debug function loaded. Run testConversations() in the console to test.');

