import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Sparkles, BookOpen, Lightbulb, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import Mascot from "@/components/Mascot";
import { getGroqCompletion } from "@/services/groq";
import { statsStore } from "@/utils/statsStore";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  analogy?: string;
}

const subjects = [
  { id: "math", label: "Mathematics", icon: "🔢" },
  { id: "biology", label: "Biology", icon: "🧬" },
  { id: "history", label: "History", icon: "📜" },
  { id: "physics", label: "Physics", icon: "⚡" },
  { id: "chemistry", label: "Chemistry", icon: "🧪" },
  { id: "literature", label: "Literature", icon: "📚" },
  { id: "computing", label: "Computing", icon: "💻" },
  { id: "economics", label: "Economics", icon: "📈" },
  { id: "business", label: "Business Studies", icon: "💼" },
  { id: "commerce", label: "Commerce", icon: "💰" },
];

const sampleAnalogies: Record<string, { topic: string; analogy: string; explanation: string }[]> = {
  math: [
    {
      topic: "Algebra (Variables)",
      analogy: "Think of variables like empty boxes in a video game inventory. The box can hold different items (numbers), but the box itself stays the same!",
      explanation: "Just like how a game inventory slot can hold a sword, potion, or shield, a variable like 'x' can hold any number. When you solve for x, you're figuring out what's in the box!"
    },
    {
      topic: "Fractions",
      analogy: "Fractions are like splitting a pizza with friends. If you have 1/4, you're getting one slice out of a pizza cut into 4 equal pieces!",
      explanation: "The bottom number (denominator) tells you how many slices the pizza is cut into, and the top number (numerator) tells you how many slices you get."
    }
  ],
  biology: [
    {
      topic: "Cell Mitochondria",
      analogy: "Mitochondria are like the power plants of a city. Just as power plants convert fuel into electricity for homes, mitochondria convert food into energy (ATP) for the cell!",
      explanation: "Without power plants, a city goes dark. Without mitochondria, cells can't function—that's why they're called the 'powerhouse of the cell'!"
    },
    {
      topic: "DNA",
      analogy: "DNA is like the recipe book in a kitchen. It contains all the instructions needed to make you—like recipes for eye color, height, and more!",
      explanation: "Each gene is like a single recipe. When your cells need to make something (like a protein), they look up the recipe in the DNA cookbook."
    }
  ],
  physics: [
    {
      topic: "Gravity",
      analogy: "Gravity is like an invisible magnet that pulls everything toward Earth. It's why your basketball always comes back down after you shoot!",
      explanation: "The bigger an object, the stronger its 'magnet.' Earth is huge, so it pulls everything toward its center—including you!"
    },
    {
      topic: "Electricity",
      analogy: "Electric current is like water flowing through pipes. Voltage is the water pressure, and resistance is how narrow the pipes are!",
      explanation: "High voltage = high pressure = more power. Narrow pipes (high resistance) slow down the flow, just like thin wires resist current."
    }
  ],
  history: [
    {
      topic: "The Renaissance",
      analogy: "The Renaissance was like rebooting a computer after a long freeze. Europe 'restarted' after the Middle Ages with fresh ideas in art, science, and thinking!",
      explanation: "Just like how a restart clears glitches and runs new programs, the Renaissance cleared old ways and introduced innovations that shaped our modern world."
    }
  ],
  chemistry: [
    {
      topic: "Chemical Bonds",
      analogy: "Atoms bonding is like people holding hands. Some hold hands loosely (ionic bonds), while others interlock fingers tightly (covalent bonds)!",
      explanation: "Ionic bonds are like two people holding hands where one is much stronger—they can let go easily. Covalent bonds share equally, like best friends!"
    }
  ],
  literature: [
    {
      topic: "Metaphors",
      analogy: "A metaphor is like calling your friend a 'rockstar' when they ace a test—you don't mean they literally sing, just that they're amazing!",
      explanation: "Metaphors create vivid images by comparing two things directly. 'Life is a journey' helps us think about life as an adventure with ups and downs."
    }
  ],
  computing: [
    {
      topic: "Algorithms",
      analogy: "An algorithm is like a recipe for making a sandwich. You follow specific steps in a specific order to get the final result!",
      explanation: "Computers need these step-by-step instructions (like 'add bread', then 'add jam') to perform tasks, solve problems, and run your favorite apps."
    }
  ],
  economics: [
    {
      topic: "Supply and Demand",
      analogy: "Think of supply and demand like a limited edition drop of your favorite sneakers. If everyone wants them (high demand) but there are only a few pairs (low supply), the price goes up!",
      explanation: "Prices in a market are determined by how much people want something versus how much of it is available. It's the balancing act of the economy."
    }
  ],
  business: [
    {
      topic: "Marketing",
      analogy: "Marketing is like trying to be the most popular person at a party. You need to know what people like, dress appropriately, and have interesting things to say!",
      explanation: "Businesses use marketing to understand their customers (the party guests) and present their products in a way that makes people want to 'hang out' with their brand."
    }
  ],
  commerce: [
    {
      topic: "Profit and Loss",
      analogy: "Profit and loss is like playing a game with coins. If you win more coins than you spent to enter the game, you have a profit. If you spend more than you win, you have a loss!",
      explanation: "In commerce, businesses track their income (wins) and expenses (costs). Success means keeping your 'wins' higher than your 'costs' consistently."
    }
  ]
};

/**
 * ANALOGY TUTOR: This is where you actually talk to Quizzy (the AI).
 * It uses your preferences to explain things in a way that makes sense to YOU.
 */
const Chat = () => {
  const navigate = useNavigate();
  
  // CURRENT TOPIC: Which subject are we talking about right now?
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  
  // CONVERSATION: All the messages you and the AI have exchanged.
  const [messages, setMessages] = useState<Message[]>([]);
  
  // INPUT: What you're currently typing in the box.
  const [input, setInput] = useState("");
  
  // THINKING: This is true while we're waiting for the AI to reply.
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // RETRIEVING MEMORY: We pull your hobbies and subjects from the browser.
  const userPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
  const userName = userPrefs.name || "Student";
  const userHobbies = userPrefs.hobbies || ["gaming", "sports"];
  const userSubjects = userPrefs.subjects || [];

  useEffect(() => {
    // If you've already picked subjects, let's start with the first one!
    if (userSubjects.length > 0 && !selectedSubject) {
      setSelectedSubject(userSubjects[0]);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // PICKING A TOPIC: This runs when you select a subject icon.
  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubject(subjectId);
    const subject = subjects.find(s => s.id === subjectId);
    
    // WELCOME: We start the chat with a friendly message and a pre-written analogy.
    const analogies = sampleAnalogies[subjectId] || [];
    const firstAnalogy = analogies[0];
    
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: `Hi ${userName}! Great choice! Let's explore ${subject?.label} ${subject?.icon} using analogies you'll love!\n\n**${firstAnalogy?.topic}**\n\n${firstAnalogy?.analogy}\n\n${firstAnalogy?.explanation}`,
      analogy: firstAnalogy?.topic
    }]);
  };

  // TALKING TO THE AI: This is where the magic happens!
  const handleSend = () => {
    if (!input.trim() || !selectedSubject) return;

    // 1. We show your message on the screen immediately.
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true); // Show the "thinking" dots.

    // Record the conversation
    if (selectedSubject) {
      statsStore.recordChat(subjects.find(s => s.id === selectedSubject)?.label || selectedSubject);
    }
    
    // 2. We talk to the AI brain behind the scenes.
    (async () => {
      // We package up the chat history so the AI remembers what we've already said.
      const messagesHistory = messages.map(m => ({ 
        role: m.role, 
        content: m.content 
      }));
      
      const newHistory = [...messagesHistory, { role: "user" as const, content: input }];
      
      // We also give the AI "Context" (your hobbies and style).
      const context = {
        subjects: selectedSubject ? [selectedSubject] : userSubjects,
        hobbies: userHobbies,
        learningStyle: userPrefs.learningStyle
      };

      // FETCH: We send the request over the internet and wait.
      const aiResponse = await getGroqCompletion(newHistory, context);

      // 3. We show the AI's reply on the screen.
      const response: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse.content || "I'm not sure how to answer that.",
      };

      setMessages(prev => [...prev, response]);
      setIsTyping(false); // Hide the dots.
    })();
  };

  const handleNewTopic = () => {
    if (!selectedSubject) return;
    
    const analogies = sampleAnalogies[selectedSubject] || [];
    const usedTopics = messages.filter(m => m.analogy).map(m => m.analogy);
    const availableAnalogies = analogies.filter(a => !usedTopics.includes(a.topic));
    
    if (availableAnalogies.length === 0) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "We've covered all the main topics! Try asking me a specific question, or pick a different subject to explore! 🎯"
      }]);
      return;
    }

    const nextAnalogy = availableAnalogies[0];
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "assistant",
      content: `Here's another concept for you!\n\n**${nextAnalogy.topic}**\n\n${nextAnalogy.analogy}\n\n${nextAnalogy.explanation}`,
      analogy: nextAnalogy.topic
    }]);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="liquid-blob w-96 h-96 bg-primary/20 -top-48 -right-48 fixed" />
      <div className="liquid-blob w-64 h-64 bg-accent/20 bottom-20 -left-32 fixed" style={{ animationDelay: '-2s' }} />

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-6 relative z-10">
        {/* Header */}
        <motion.header
          className="glass-card px-6 py-4 mb-4 flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold gradient-text">Analogy Tutor</h1>
          </div>
          <div className="w-20" /> {/* Spacer for centering */}
        </motion.header>

        {!selectedSubject ? (
          /* Subject Selection */
          <motion.div
            className="flex-1 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center mb-8">
              <Mascot size="lg" mood="brain" />
              <h2 className="text-2xl font-bold text-foreground mt-4 mb-2">
                What shall we explore today? 🚀
              </h2>
              <p className="text-muted-foreground">
                Pick a subject and I'll teach you through fun analogies!
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-lg">
              {subjects.map((subject, index) => (
                <motion.button
                  key={subject.id}
                  onClick={() => handleSubjectSelect(subject.id)}
                  className="glass-card p-6 text-center hover:border-primary/50 transition-all"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-4xl mb-2 block">{subject.icon}</span>
                  <span className="font-medium text-foreground">{subject.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Chat Interface */
          <>
            {/* Subject Badge */}
            <motion.div
              className="flex items-center justify-center gap-2 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedSubject(null);
                  setMessages([]);
                }}
                className="gap-2"
              >
                <BookOpen className="w-4 h-4" />
                {subjects.find(s => s.id === selectedSubject)?.icon}{" "}
                {subjects.find(s => s.id === selectedSubject)?.label}
              </Button>
              <Button variant="outline" size="sm" onClick={handleNewTopic} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                New Topic
              </Button>
            </motion.div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "glass-card rounded-bl-md"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                            <Lightbulb className="w-3 h-3 text-primary-foreground" />
                          </div>
                          <span className="text-xs font-medium text-primary">Quizzy</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="glass-card p-4 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                        <Lightbulb className="w-3 h-3 text-primary-foreground" />
                      </div>
                      <div className="flex gap-1">
                        <motion.span
                          className="w-2 h-2 bg-primary rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6 }}
                        />
                        <motion.span
                          className="w-2 h-2 bg-primary rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }}
                        />
                        <motion.span
                          className="w-2 h-2 bg-primary rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <motion.div
              className="glass-card p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-3"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything about this subject..."
                  className="flex-1 glass border-border"
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="gap-2 gradient-primary text-primary-foreground border-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                I'll explain concepts using analogies based on your interests! 🎯
              </p>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
