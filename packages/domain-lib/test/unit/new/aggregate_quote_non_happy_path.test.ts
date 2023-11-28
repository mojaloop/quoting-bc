//#region handleQuoteResponseReceivedEvt

// test("handleQuoteResponseReceivedEvt - should send error event if requesterFspId not valid", async () => {
//     // Arrange
//     const mockedQuote = mockedQuote1;
//     const payload:QuoteResponseReceivedEvtPayload = createQuoteResponseReceivedEvtPayload(mockedQuote);

//     const message: IMessage = createMessage(payload, QuoteResponseReceivedEvt.name, null);

//     const errorMsg = InvalidRequesterFspIdError.name;

//     const errorPayload: QuoteErrorEvtPayload = {
// 		errorMsg,
// 		requesterFspId:null,
//         destinationFspId: null,
//         quoteId: payload.quoteId,
//         sourceEvent : QuoteResponseReceivedEvt.name,
// 	};

//     jest.spyOn(messageProducer, "send");

//     // Act
//     await aggregate.handleQuotingEvent(message);

//     // Assert
//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));

// });

// test("handleQuoteResponseReceivedEvt - should send error event if destinationFspId not valid", async () => {
//     // Arrange
//     const mockedQuote = mockedQuote1;

//     const payload:QuoteResponseReceivedEvtPayload = createQuoteResponseReceivedEvtPayload(mockedQuote);

//     const fspiopOpaqueState = {
//         requesterFspId: "payer",
//     };
//     const message: IMessage = createMessage(payload, QuoteResponseReceivedEvt.name,fspiopOpaqueState);

//     const errorMsg = InvalidDestinationFspIdError.name;

//     const errorPayload: QuoteErrorEvtPayload = {
// 		errorMsg,
// 		requesterFspId:"payer",
//         destinationFspId: null,
//         quoteId: payload.quoteId,
//         sourceEvent : QuoteResponseReceivedEvt.name,
// 	};

//     jest.spyOn(messageProducer, "send");

//     // Act
//     await aggregate.handleQuotingEvent(message);

//     // Assert
//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));

// });

// test("handleQuoteResponseReceivedEvt - should send error event if couldnt validate requester participant", async () => {
//     // Arrange
//     const mockedQuote = mockedQuote1;
//     const payload:QuoteResponseReceivedEvtPayload = createQuoteResponseReceivedEvtPayload(mockedQuote);

//     const fspiopOpaqueState = {
//         requesterFspId: "payer",
//         destinationFspId: "payee",
//     };
//     const message: IMessage = createMessage(payload, QuoteResponseReceivedEvt.name,fspiopOpaqueState);

//     const errorMsg = NoSuchParticipantError.name;

//     const errorPayload: QuoteErrorEvtPayload = {
//         errorMsg,
//         requesterFspId:"payer",
//         destinationFspId: "payee",
//         quoteId: payload.quoteId,
//         sourceEvent : QuoteResponseReceivedEvt.name,
//     };

//     jest.spyOn(participantService,"getParticipantInfo")
//         .mockResolvedValue(null);

//     jest.spyOn(messageProducer, "send");

//     // Act
//     await aggregate.handleQuotingEvent(message);

//     // Assert
//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));

// });

// test("handleQuoteResponseReceivedEvt - should send error event if couldnt find quote on database", async () => {
//     // Arrange
//     const mockedQuote = mockedQuote1;
//     const payload:QuoteResponseReceivedEvtPayload = createQuoteResponseReceivedEvtPayload(mockedQuote);

//     const fspiopOpaqueState = {
//         requesterFspId: "payer",
//         destinationFspId: "payee",
//     }
//     const message: IMessage = createMessage(payload,QuoteResponseReceivedEvt.name, fspiopOpaqueState);

//     const errorMsg = NoSuchQuoteError.name;

//     const errorPayload: QuoteErrorEvtPayload = {
//         errorMsg,
//         requesterFspId:"payer",
//         destinationFspId: "payee",
//         quoteId: payload.quoteId,
//         sourceEvent : QuoteResponseReceivedEvt.name,
//     };

//     jest.spyOn(participantService,"getParticipantInfo")
//         .mockResolvedValueOnce({ id: "payer", type: "DFSP", isActive: true} as IParticipant)
//         .mockResolvedValueOnce({ id: "payee", type: "DFSP", isActive: true} as IParticipant);

//     jest.spyOn(quoteRepo, "getQuoteById")
//         .mockResolvedValueOnce(null);

//     jest.spyOn(messageProducer, "send");

//     // Act
//     await aggregate.handleQuotingEvent(message);

//     // Assert
//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));

// });

// test("handleQuoteQueryReceivedEvt - should send error event if requesterFspId not valid", async () => {
//     // Arrange
//     const payload: QuoteQueryReceivedEvtPayload = {
//         quoteId: "quoteId",
//     };

//     const message: IMessage = createMessage(payload,QuoteQueryReceivedEvt.name, {});

//     const errorMsg = InvalidRequesterFspIdError.name;

//     const errorPayload: QuoteErrorEvtPayload = {
//         destinationFspId: null,
//         errorMsg,
//         quoteId: "quoteId",
//         requesterFspId: null,
//         sourceEvent: QuoteQueryReceivedEvt.name,
//     };

//     jest.spyOn(messageProducer, "send");

//     // Act
//     await aggregate.handleQuotingEvent(message);

//     // Assert
//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));
// });

// test("handleQuoteQueryReceivedEvt - should send error event if destinationFspId not valid", async () => {
//     // Arrange
//     const payload: QuoteQueryReceivedEvtPayload = {
//         quoteId: "quoteId",
//     };

//     const fspiopOpaqueState = {
//         requesterFspId: "payer",
//     };

//     const message: IMessage = createMessage(payload,QuoteQueryReceivedEvt.name, fspiopOpaqueState);

//     const errorMsg = InvalidDestinationFspIdError.name;

//     const errorPayload: QuoteErrorEvtPayload = {
//         destinationFspId: null,
//         errorMsg,
//         quoteId: "quoteId",
//         requesterFspId: "payer",
//         sourceEvent: QuoteQueryReceivedEvt.name,
//     };

//     jest.spyOn(messageProducer, "send");

//     // Act
//     await aggregate.handleQuotingEvent(message);

//     // Assert
//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));
// });

// test("handleQuoteQueryReceivedEvt - should send error event if participant for requesterFspId not valid", async () => {
//     // Arrange
//     const payload: QuoteQueryReceivedEvtPayload = {
//         quoteId: "quoteId",
//     };

//     const fspiopOpaqueState = {
//         requesterFspId: "payer",
//         destinationFspId: "payee",
//     };

//     const message: IMessage = createMessage(payload,QuoteQueryReceivedEvt.name, fspiopOpaqueState);

//     const errorMsg = NoSuchParticipantError.name;

//     const errorPayload: QuoteErrorEvtPayload = {
//         destinationFspId: "payee",
//         errorMsg,
//         quoteId: "quoteId",
//         requesterFspId: "payer",
//         sourceEvent: QuoteQueryReceivedEvt.name,
//     };

//     jest.spyOn(participantService,"getParticipantInfo")
//         .mockResolvedValueOnce(null);

//     jest.spyOn(messageProducer, "send");

//     // Act
//     await aggregate.handleQuotingEvent(message);

//     // Assert
//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));
// });

// test("handleQuoteQueryReceivedEvt - should send error event if couldnt find the quote asked", async () => {
//     // Arrange
//     const payload: QuoteQueryReceivedEvtPayload = {
//         quoteId: "quoteId",
//     };

//     const fspiopOpaqueState = {
//         requesterFspId: "payer",
//         destinationFspId: "payee",
//     };

//     const message: IMessage = createMessage(payload,QuoteQueryReceivedEvt.name, fspiopOpaqueState);

//     const errorMsg = NoSuchQuoteError.name;

//     const errorPayload: QuoteErrorEvtPayload = {
//         destinationFspId: "payee",
//         errorMsg,
//         quoteId: "quoteId",
//         requesterFspId: "payer",
//         sourceEvent: QuoteQueryReceivedEvt.name,
//     };

//     jest.spyOn(participantService,"getParticipantInfo")
//         .mockResolvedValueOnce({ id: "payer", type: "DFSP", isActive: true} as IParticipant)
//         .mockResolvedValueOnce({ id: "payee", type: "DFSP", isActive: true} as IParticipant);

//     jest.spyOn(quoteRepo, "getQuoteById")
//         .mockResolvedValueOnce(null);

//     jest.spyOn(messageProducer, "send");

//     // Act
//     await aggregate.handleQuotingEvent(message);

//     // Assert
//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));
// });
